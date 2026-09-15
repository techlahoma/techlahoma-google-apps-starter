/// The most atomic way to train and inference a GPT in pure, dependency-free Rust.
/// This file is the complete algorithm.
/// Everything else is just efficiency.
///
/// @karpathy (original Python), converted to Rust

use std::cell::RefCell;
use std::collections::BTreeSet;
use std::rc::Rc;

// --- RNG (xoshiro256** seeded with 42, no external crate needed) ---
struct Rng {
    s: [u64; 4],
}

impl Rng {
    fn new(seed: u64) -> Self {
        // SplitMix64 to seed xoshiro
        let mut sm = seed;
        let mut s = [0u64; 4];
        for slot in &mut s {
            sm = sm.wrapping_add(0x9e3779b97f4a7c15);
            let mut z = sm;
            z = (z ^ (z >> 30)).wrapping_mul(0xbf58476d1ce4e5b9);
            z = (z ^ (z >> 27)).wrapping_mul(0x94d049bb133111eb);
            *slot = z ^ (z >> 31);
        }
        Rng { s }
    }

    fn next_u64(&mut self) -> u64 {
        let result = (self.s[1].wrapping_mul(5)).rotate_left(7).wrapping_mul(9);
        let t = self.s[1] << 17;
        self.s[2] ^= self.s[0];
        self.s[3] ^= self.s[1];
        self.s[1] ^= self.s[2];
        self.s[0] ^= self.s[3];
        self.s[2] ^= t;
        self.s[3] = self.s[3].rotate_left(45);
        result
    }

    fn next_f64(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }

    /// Box-Muller transform for gaussian
    fn gauss(&mut self, mean: f64, std: f64) -> f64 {
        let u1 = self.next_f64().max(1e-30);
        let u2 = self.next_f64();
        mean + std * (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos()
    }

    /// Fisher-Yates shuffle
    fn shuffle<T>(&mut self, v: &mut [T]) {
        for i in (1..v.len()).rev() {
            let j = (self.next_u64() as usize) % (i + 1);
            v.swap(i, j);
        }
    }

    /// Weighted random choice (returns index)
    fn weighted_choice(&mut self, weights: &[f64]) -> usize {
        let total: f64 = weights.iter().sum();
        let mut r = self.next_f64() * total;
        for (i, &w) in weights.iter().enumerate() {
            r -= w;
            if r <= 0.0 {
                return i;
            }
        }
        weights.len() - 1
    }
}

// --- Let there be Autograd ---
struct ValueInner {
    data: f64,
    grad: f64,
    children: Vec<Value>,
    local_grads: Vec<f64>,
}

#[derive(Clone)]
struct Value(Rc<RefCell<ValueInner>>);

impl Value {
    fn new(data: f64, children: Vec<Value>, local_grads: Vec<f64>) -> Self {
        Value(Rc::new(RefCell::new(ValueInner {
            data,
            grad: 0.0,
            children,
            local_grads,
        })))
    }

    fn scalar(data: f64) -> Self {
        Value::new(data, vec![], vec![])
    }

    fn data(&self) -> f64 {
        self.0.borrow().data
    }

    fn grad(&self) -> f64 {
        self.0.borrow().grad
    }

    fn set_data(&self, d: f64) {
        self.0.borrow_mut().data = d;
    }

    fn set_grad(&self, g: f64) {
        self.0.borrow_mut().grad = g;
    }

    fn add(&self, other: &Value) -> Value {
        Value::new(
            self.data() + other.data(),
            vec![self.clone(), other.clone()],
            vec![1.0, 1.0],
        )
    }

    fn mul(&self, other: &Value) -> Value {
        let sd = self.data();
        let od = other.data();
        Value::new(
            sd * od,
            vec![self.clone(), other.clone()],
            vec![od, sd],
        )
    }

    fn add_scalar(&self, s: f64) -> Value {
        self.add(&Value::scalar(s))
    }

    fn mul_scalar(&self, s: f64) -> Value {
        self.mul(&Value::scalar(s))
    }

    fn vpow(&self, exp: f64) -> Value {
        let d = self.data();
        Value::new(
            d.powf(exp),
            vec![self.clone()],
            vec![exp * d.powf(exp - 1.0)],
        )
    }

    fn vlog(&self) -> Value {
        let d = self.data();
        Value::new(d.ln(), vec![self.clone()], vec![1.0 / d])
    }

    fn vexp(&self) -> Value {
        let e = self.data().exp();
        Value::new(e, vec![self.clone()], vec![e])
    }

    fn relu(&self) -> Value {
        let d = self.data();
        Value::new(
            if d > 0.0 { d } else { 0.0 },
            vec![self.clone()],
            vec![if d > 0.0 { 1.0 } else { 0.0 }],
        )
    }

    fn neg(&self) -> Value {
        self.mul_scalar(-1.0)
    }

    fn sub(&self, other: &Value) -> Value {
        self.add(&other.neg())
    }

    fn div(&self, other: &Value) -> Value {
        self.mul(&other.vpow(-1.0))
    }

    fn div_scalar(&self, s: f64) -> Value {
        self.mul_scalar(1.0 / s)
    }

    fn ptr_eq(&self, other: &Value) -> bool {
        Rc::ptr_eq(&self.0, &other.0)
    }

    fn backward(&self) {
        // Topological sort
        let mut topo: Vec<Value> = Vec::new();
        let mut visited = std::collections::HashSet::new();

        fn build_topo(v: &Value, topo: &mut Vec<Value>, visited: &mut std::collections::HashSet<*const std::cell::RefCell<ValueInner>>) {
            let ptr = Rc::as_ptr(&v.0);
            if !visited.insert(ptr) {
                return;
            }
            let inner = v.0.borrow();
            for child in &inner.children {
                build_topo(child, topo, visited);
            }
            drop(inner);
            topo.push(v.clone());
        }

        build_topo(self, &mut topo, &mut visited);
        self.set_grad(1.0);
        for v in topo.iter().rev() {
            let inner = v.0.borrow();
            let vgrad = inner.grad;
            for (child, &lg) in inner.children.iter().zip(inner.local_grads.iter()) {
                let old = child.grad();
                child.set_grad(old + lg * vgrad);
            }
        }
    }
}

type Vec1 = Vec<Value>;
type Mat = Vec<Vec1>;

fn sum_vals(v: &[Value]) -> Value {
    let mut s = Value::scalar(0.0);
    for x in v {
        s = s.add(x);
    }
    s
}

// --- Model functions ---
fn linear(x: &[Value], w: &Mat) -> Vec1 {
    w.iter()
        .map(|wo| {
            let mut s = Value::scalar(0.0);
            for (wi, xi) in wo.iter().zip(x.iter()) {
                s = s.add(&wi.mul(xi));
            }
            s
        })
        .collect()
}

fn softmax(logits: &[Value]) -> Vec1 {
    let max_val = logits.iter().map(|v| v.data()).fold(f64::NEG_INFINITY, f64::max);
    let exps: Vec1 = logits.iter().map(|v| v.add_scalar(-max_val).vexp()).collect();
    let total = sum_vals(&exps);
    exps.iter().map(|e| e.div(&total)).collect()
}

fn rmsnorm(x: &[Value]) -> Vec1 {
    let ms = {
        let mut s = Value::scalar(0.0);
        for xi in x {
            s = s.add(&xi.mul(xi));
        }
        s.div_scalar(x.len() as f64)
    };
    let scale = ms.add_scalar(1e-5).vpow(-0.5);
    x.iter().map(|xi| xi.mul(&scale)).collect()
}

fn main() {
    let mut rng = Rng::new(42);

    // Let there be an input dataset
    // Synthetic workshop topics, not real meetup records.
    let content = "build with gemma\nlearn rust\nlocal ai lab\nrag workshop\ntrain tiny models\nweb gpu night\nandroid ai\ncontext lab\nfunction calling\nbuild with flutter\ngoogle cloud lab\ngemma makers";
    let mut docs: Vec<String> = content
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();
    rng.shuffle(&mut docs);
    println!("num docs: {}", docs.len());

    // Let there be a Tokenizer
    let mut char_set = BTreeSet::new();
    for d in &docs {
        for c in d.chars() {
            char_set.insert(c);
        }
    }
    let uchars: Vec<char> = char_set.into_iter().collect();
    let bos: usize = uchars.len();
    let vocab_size: usize = uchars.len() + 1;
    println!("vocab size: {}", vocab_size);

    let char_index = |c: char| -> usize {
        uchars.iter().position(|&x| x == c).unwrap()
    };

    // Initialize the parameters
    let n_embd: usize = 8;
    let n_head: usize = 2;
    let n_layer: usize = 1;
    let block_size: usize = 16;
    let head_dim: usize = n_embd / n_head;

    let mut make_matrix = |nout: usize, nin: usize| -> Mat {
        (0..nout)
            .map(|_| (0..nin).map(|_| Value::scalar(rng.gauss(0.0, 0.08))).collect())
            .collect()
    };

    // state_dict
    let wte = make_matrix(vocab_size, n_embd);
    let wpe = make_matrix(block_size, n_embd);
    let lm_head = make_matrix(vocab_size, n_embd);

    // Per-layer weights
    struct LayerWeights {
        attn_wq: Mat,
        attn_wk: Mat,
        attn_wv: Mat,
        attn_wo: Mat,
        mlp_fc1: Mat,
        mlp_fc2: Mat,
    }

    let mut layers: Vec<LayerWeights> = Vec::new();
    for _ in 0..n_layer {
        layers.push(LayerWeights {
            attn_wq: make_matrix(n_embd, n_embd),
            attn_wk: make_matrix(n_embd, n_embd),
            attn_wv: make_matrix(n_embd, n_embd),
            attn_wo: make_matrix(n_embd, n_embd),
            mlp_fc1: make_matrix(4 * n_embd, n_embd),
            mlp_fc2: make_matrix(n_embd, 4 * n_embd),
        });
    }

    // Flatten params
    let mut params: Vec<Value> = Vec::new();
    for row in &wte { for p in row { params.push(p.clone()); } }
    for row in &wpe { for p in row { params.push(p.clone()); } }
    for row in &lm_head { for p in row { params.push(p.clone()); } }
    for lw in &layers {
        for mat in [&lw.attn_wq, &lw.attn_wk, &lw.attn_wv, &lw.attn_wo, &lw.mlp_fc1, &lw.mlp_fc2] {
            for row in mat { for p in row { params.push(p.clone()); } }
        }
    }
    println!("num params: {}", params.len());

    // GPT function
    let gpt = |token_id: usize, pos_id: usize,
               keys: &mut Vec<Vec<Vec1>>, values: &mut Vec<Vec<Vec1>>| -> Vec1 {
        let tok_emb = &wte[token_id];
        let pos_emb = &wpe[pos_id];
        let mut x: Vec1 = tok_emb.iter().zip(pos_emb.iter()).map(|(t, p)| t.add(p)).collect();
        x = rmsnorm(&x);

        for li in 0..n_layer {
            // 1) Multi-head attention block
            let x_residual = x.clone();
            x = rmsnorm(&x);
            let q = linear(&x, &layers[li].attn_wq);
            let k = linear(&x, &layers[li].attn_wk);
            let v = linear(&x, &layers[li].attn_wv);
            keys[li].push(k);
            values[li].push(v);
            let mut x_attn: Vec1 = Vec::new();
            for h in 0..n_head {
                let hs = h * head_dim;
                let q_h: Vec1 = q[hs..hs + head_dim].to_vec();
                let k_h: Vec<Vec1> = keys[li].iter().map(|ki| ki[hs..hs + head_dim].to_vec()).collect();
                let v_h: Vec<Vec1> = values[li].iter().map(|vi| vi[hs..hs + head_dim].to_vec()).collect();
                let scale = (head_dim as f64).sqrt();
                let attn_logits: Vec1 = k_h
                    .iter()
                    .map(|kt| {
                        let mut dot = Value::scalar(0.0);
                        for j in 0..head_dim {
                            dot = dot.add(&q_h[j].mul(&kt[j]));
                        }
                        dot.div_scalar(scale)
                    })
                    .collect();
                let attn_weights = softmax(&attn_logits);
                for j in 0..head_dim {
                    let mut s = Value::scalar(0.0);
                    for t in 0..v_h.len() {
                        s = s.add(&attn_weights[t].mul(&v_h[t][j]));
                    }
                    x_attn.push(s);
                }
            }
            x = linear(&x_attn, &layers[li].attn_wo);
            for i in 0..n_embd {
                x[i] = x[i].add(&x_residual[i]);
            }
            // 2) MLP block
            let x_residual = x.clone();
            x = rmsnorm(&x);
            x = linear(&x, &layers[li].mlp_fc1);
            x = x.iter().map(|xi| xi.relu()).collect();
            x = linear(&x, &layers[li].mlp_fc2);
            for i in 0..n_embd {
                x[i] = x[i].add(&x_residual[i]);
            }
        }

        linear(&x, &lm_head)
    };

    // Let there be Adam
    let learning_rate: f64 = 0.01;
    let beta1: f64 = 0.85;
    let beta2: f64 = 0.99;
    let eps_adam: f64 = 1e-8;
    let mut m_buf = vec![0.0f64; params.len()];
    let mut v_buf = vec![0.0f64; params.len()];

    // Repeat in sequence
    let num_steps: usize = 30;
    for step in 0..num_steps {
        // Take single document, tokenize it
        let doc = &docs[step % docs.len()];
        let mut tokens: Vec<usize> = Vec::new();
        tokens.push(bos);
        for c in doc.chars() {
            tokens.push(char_index(c));
        }
        tokens.push(bos);
        let n = block_size.min(tokens.len() - 1);

        // Forward
        let mut keys: Vec<Vec<Vec1>> = (0..n_layer).map(|_| Vec::new()).collect();
        let mut vals: Vec<Vec<Vec1>> = (0..n_layer).map(|_| Vec::new()).collect();
        let mut losses: Vec1 = Vec::new();
        for pos_id in 0..n {
            let token_id = tokens[pos_id];
            let target_id = tokens[pos_id + 1];
            let logits = gpt(token_id, pos_id, &mut keys, &mut vals);
            let probs = softmax(&logits);
            let loss_t = probs[target_id].vlog().neg();
            losses.push(loss_t);
        }
        let loss = sum_vals(&losses).div_scalar(n as f64);

        // Backward
        loss.backward();

        // Adam optimizer update
        let lr_t = learning_rate * (1.0 - step as f64 / num_steps as f64);
        for (i, p) in params.iter().enumerate() {
            let g = p.grad();
            m_buf[i] = beta1 * m_buf[i] + (1.0 - beta1) * g;
            v_buf[i] = beta2 * v_buf[i] + (1.0 - beta2) * g * g;
            let m_hat = m_buf[i] / (1.0 - beta1.powi((step + 1) as i32));
            let v_hat = v_buf[i] / (1.0 - beta2.powi((step + 1) as i32));
            let d = p.data();
            p.set_data(d - lr_t * m_hat / (v_hat.sqrt() + eps_adam));
            p.set_grad(0.0);
        }

        println!("step {:4} / {:4} | loss {:.4}", step + 1, num_steps, loss.data());
    }

    // Inference
    let temperature: f64 = 0.5;
    println!("\n--- inference (synthetic generated topic fragments; not actual meetup events) ---");
    for sample_idx in 0..5 {
        let mut keys: Vec<Vec<Vec1>> = (0..n_layer).map(|_| Vec::new()).collect();
        let mut vals: Vec<Vec<Vec1>> = (0..n_layer).map(|_| Vec::new()).collect();
        let mut token_id = bos;
        let mut sample = String::new();
        for pos_id in 0..block_size {
            let logits = gpt(token_id, pos_id, &mut keys, &mut vals);
            let temp_logits: Vec1 = logits.iter().map(|l| l.div_scalar(temperature)).collect();
            let probs = softmax(&temp_logits);
            let weights: Vec<f64> = probs.iter().map(|p| p.data()).collect();
            token_id = rng.weighted_choice(&weights);
            if token_id == bos {
                break;
            }
            sample.push(uchars[token_id]);
        }
        println!("sample {:2}: {}", sample_idx + 1, sample);
    }
}

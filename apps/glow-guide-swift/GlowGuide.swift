import SwiftUI
import AppKit

// MARK: - Models & Data Structures

enum SkinConcern: String, CaseIterable, Identifiable, Codable {
    case acne = "Acne & Blemishes"
    case dryness = "Dryness & Dehydration"
    case aging = "Fine Lines & Aging"
    case hyperpigmentation = "Dark Spots & Pigmentation"
    case redness = "Sensitivity & Redness"
    case dullness = "Dullness & Lack of Radiance"
    
    var id: String { rawValue }
    
    var description: String {
        switch self {
        case .acne: return "Breakouts, clogged pores, excess sebum, and inflammation."
        case .dryness: return "Flakiness, tightness, dull texture, and weakened moisture barrier."
        case .aging: return "Loss of elasticity, fine lines, wrinkles, and diminished firmness."
        case .hyperpigmentation: return "Sun damage spots, post-acne marks, and uneven skin tone."
        case .redness: return "Rosacea tendencies, easily irritated skin, and flushing."
        case .dullness: return "Tired skin, uneven surface texture, and lack of healthy glow."
        }
    }
    
    var icon: String {
        switch self {
        case .acne: return "comb.fill"
        case .dryness: return "drop.fill"
        case .aging: return "sparkles"
        case .hyperpigmentation: return "sun.max.fill"
        case .redness: return "shield.fill"
        case .dullness: return "bolt.heart.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .acne: return Color(red: 0.95, green: 0.45, blue: 0.55)
        case .dryness: return Color(red: 0.35, green: 0.70, blue: 0.90)
        case .aging: return Color(red: 0.85, green: 0.65, blue: 0.40)
        case .hyperpigmentation: return Color(red: 0.95, green: 0.65, blue: 0.25)
        case .redness: return Color(red: 0.90, green: 0.40, blue: 0.40)
        case .dullness: return Color(red: 0.75, green: 0.50, blue: 0.90)
        }
    }
}

enum SkincareGoal: String, CaseIterable, Identifiable, Codable {
    case glassSkin = "Glass Skin Glow"
    case clearSkin = "Clear & Blemish-Free"
    case youthfulFirmness = "Firm & Youthful Plump"
    case evenTone = "Even & Bright Complexion"
    case barrierRepair = "Soothed & Restored Barrier"
    
    var id: String { rawValue }
    
    var subtitle: String {
        switch self {
        case .glassSkin: return "Deep hydration & translucent luminous shine"
        case .clearSkin: return "Refined pores & smooth acne-free clarity"
        case .youthfulFirmness: return "Boosted collagen & diminished fine lines"
        case .evenTone: return "Faded dark spots & vibrant uniform radiance"
        case .barrierRepair: return "Nourished skin moisture seal with zero redness"
        }
    }
    
    var icon: String {
        switch self {
        case .glassSkin: return "stars"
        case .clearSkin: return "checkmark.seal.fill"
        case .youthfulFirmness: return "hourglass"
        case .evenTone: return "sun.haze.fill"
        case .barrierRepair: return "heart.text.square.fill"
        }
    }
}

enum SkinType: String, CaseIterable, Identifiable, Codable {
    case oily = "Oily"
    case dry = "Dry"
    case combination = "Combination"
    case sensitive = "Sensitive"
    case normal = "Normal"
    
    var id: String { rawValue }
    
    var icon: String {
        switch self {
        case .oily: return "drop.triangle.fill"
        case .dry: return "leaf.fill"
        case .combination: return "circle.grid.2x2.fill"
        case .sensitive: return "heart.fill"
        case .normal: return "face.smiling.fill"
        }
    }
}

enum RoutinePreference: String, CaseIterable, Identifiable, Codable {
    case minimal = "Minimalist (3 Steps)"
    case balanced = "Balanced Essential (5 Steps)"
    case ultimate = "Ultimate K-Beauty Ritual (7 Steps)"
    
    var id: String { rawValue }
    
    var stepCount: Int {
        switch self {
        case .minimal: return 3
        case .balanced: return 5
        case .ultimate: return 7
        }
    }
}

struct SephoraProduct: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let brand: String
    let category: String // Cleanser, Toner, Serum, Moisturizer, Sunscreen, Eye Cream, Mask
    let price: Double
    let rating: Double
    let reviewsCount: Int
    let description: String
    let keyIngredients: [String]
    let targetConcerns: [SkinConcern]
    let targetSkinTypes: [SkinType]
    let sephoraProductId: String
    let badge: String?
    let iconName: String
    
    var affiliateUrl: String {
        return "https://www.sephora.com/product/\(sephoraProductId)?om_mmc=aff-linkshare-glowguide&utm_source=glowguide_app&utm_medium=affiliate&affiliate_id=GLOWGUIDE_SEPHORA_2026"
    }
}

struct QuizProfile: Codable {
    var concern: SkinConcern = .dryness
    var goal: SkincareGoal = .glassSkin
    var skinType: SkinType = .combination
    var preference: RoutinePreference = .balanced
    var completed: Bool = false
}

struct RoutineStepItem: Identifiable {
    let id = UUID()
    let stepNumber: Int
    let timeOfDay: TimeOfDay
    let title: String
    let categoryName: String
    let instructions: String
    let proTip: String
    let recommendedProduct: SephoraProduct
    let alternativeProduct: SephoraProduct?
    
    enum TimeOfDay: String {
        case morning = "Morning (AM)"
        case evening = "Evening (PM)"
        case both = "Daily (AM & PM)"
    }
}

struct DailyLog: Identifiable, Codable {
    let id: UUID
    let date: Date
    var completedAMSteps: Set<Int>
    var completedPMSteps: Set<Int>
    var hydrationRating: Double
    var skinFeelingNote: String
}

// MARK: - Sephora Product Repository

class SephoraCatalog {
    static let products: [SephoraProduct] = [
        // Cleansers
        SephoraProduct(
            id: "yttp-cleanser",
            name: "Superfood Antioxidant Cleanser",
            brand: "Youth To The People",
            category: "Cleanser",
            price: 39.00,
            rating: 4.8,
            reviewsCount: 14200,
            description: "Award-winning pH-balanced face wash packed with cold-pressed kale, spinach, and green tea to deeply cleanse pores without stripping moisture.",
            keyIngredients: ["Kale", "Spinach", "Green Tea", "Hyaluronic Acid"],
            targetConcerns: [.acne, .dullness, .dryness],
            targetSkinTypes: [.oily, .combination, .normal, .dry],
            sephoraProductId: "P418874",
            badge: "Sephora Choice",
            iconName: "drop.circle.fill"
        ),
        SephoraProduct(
            id: "tatcha-rice-wash",
            name: "The Rice Wash Skin-Softening Cleanser",
            brand: "Tatcha",
            category: "Cleanser",
            price: 40.00,
            rating: 4.7,
            reviewsCount: 9400,
            description: "Creamy, gentle pH-neutral daily cleanser with Japanese rice powder that washes away impurities leaving skin cloud-soft and luminous.",
            keyIngredients: ["Japanese Rice Powder", "Okinawa Red Algae", "Hyaluronic Acid"],
            targetConcerns: [.dryness, .redness, .dullness],
            targetSkinTypes: [.dry, .sensitive, .normal],
            sephoraProductId: "P461537",
            badge: "Clean at Sephora",
            iconName: "leaf.circle.fill"
        ),
        SephoraProduct(
            id: "paulas-bha-cleanser",
            name: "CLEAR Pore Normalizing Cleanser",
            brand: "Paula's Choice",
            category: "Cleanser",
            price: 19.00,
            rating: 4.7,
            reviewsCount: 6800,
            description: "Silky gel cleanser infused with Salicylic Acid to dissolve excess oil and unclog stubborn pores without tightness.",
            keyIngredients: ["Salicylic Acid 0.5%", "Pro-Vitamin B5", "Glycerin"],
            targetConcerns: [.acne, .hyperpigmentation],
            targetSkinTypes: [.oily, .combination],
            sephoraProductId: "P469502",
            badge: "Best for Acne",
            iconName: "sparkles.rectangle.stack.fill"
        ),
        
        // Toners & Exfoliants
        SephoraProduct(
            id: "paulas-choice-bha",
            name: "Skin Perfecting 2% BHA Liquid Exfoliant",
            brand: "Paula's Choice",
            category: "Toner & Exfoliant",
            price: 35.00,
            rating: 4.9,
            reviewsCount: 31200,
            description: "#1 Holy Grail leave-on exfoliant that unclogs pores, smooths wrinkles, and brightens skin tone rapidly.",
            keyIngredients: ["Salicylic Acid 2%", "Green Tea Extract", "Methylpropanediol"],
            targetConcerns: [.acne, .dullness, .hyperpigmentation],
            targetSkinTypes: [.oily, .combination, .normal],
            sephoraProductId: "P469504",
            badge: "#1 Best Seller",
            iconName: "bubbles.and.sparkles.fill"
        ),
        SephoraProduct(
            id: "glow-recipe-toner",
            name: "Watermelon Glow PHA + BHA Pore-Tight Toner",
            brand: "Glow Recipe",
            category: "Toner & Exfoliant",
            price: 35.00,
            rating: 4.6,
            reviewsCount: 11500,
            description: "Hydrating, bouncy toner with Gentle PHA and BHA to minimize the appearance of pores while imparting a dewy glass-skin sheen.",
            keyIngredients: ["Watermelon Extract", "PHA & BHA", "Cactus Water", "Hyaluronic Acid"],
            targetConcerns: [.dullness, .dryness, .acne],
            targetSkinTypes: [.combination, .dry, .oily, .normal],
            sephoraProductId: "P458219",
            badge: "Viral Favorite",
            iconName: "star.square.fill"
        ),
        
        // Serums & Actives
        SephoraProduct(
            id: "ordinary-niacinamide",
            name: "Niacinamide 10% + Zinc 1% High-Strength Serum",
            brand: "The Ordinary",
            category: "Serum",
            price: 6.00,
            rating: 4.5,
            reviewsCount: 48000,
            description: "High-potency vitamin and mineral formula to reduce congestion, balance visible sebum activity, and smooth blemishes.",
            keyIngredients: ["Niacinamide 10%", "Zinc PCA 1%"],
            targetConcerns: [.acne, .hyperpigmentation, .dullness],
            targetSkinTypes: [.oily, .combination, .normal],
            sephoraProductId: "P425909",
            badge: "Steal Deal",
            iconName: "flask.fill"
        ),
        SephoraProduct(
            id: "dunk-c-firma",
            name: "C-Firma Fresh Day Vitamin C Serum",
            brand: "Drunk Elephant",
            category: "Serum",
            price: 79.00,
            rating: 4.6,
            reviewsCount: 5400,
            description: "Packed with 15% L-Ascorbic Acid and Ferulic Acid to firm, brighten, and shield skin against environmental oxidative damage.",
            keyIngredients: ["15% L-Ascorbic Acid", "Ferulic Acid", "1% Vitamin E", "Pumpkin Ferment"],
            targetConcerns: [.hyperpigmentation, .aging, .dullness],
            targetSkinTypes: [.normal, .dry, .combination],
            sephoraProductId: "P474306",
            badge: "Derm Approved",
            iconName: "sun.max.trianglebadge.exclamationmark.fill"
        ),
        SephoraProduct(
            id: "sunday-riley-good-genes",
            name: "Good Genes All-In-One Lactic Acid Treatment",
            brand: "Sunday Riley",
            category: "Serum",
            price: 85.00,
            rating: 4.7,
            reviewsCount: 12800,
            description: "High-potency AHA treatment that instantly plumps the look of fine lines and restores radiant clarity to dull skin.",
            keyIngredients: ["Purified Lactic Acid", "Licorice Extract", "Lemongrass", "Arnica"],
            targetConcerns: [.aging, .hyperpigmentation, .dullness],
            targetSkinTypes: [.dry, .combination, .normal],
            sephoraProductId: "P309308",
            badge: "Luxury Cult Classic",
            iconName: "bolt.shield.fill"
        ),
        SephoraProduct(
            id: "glow-recipe-dew-drops",
            name: "Watermelon Glow Niacinamide Dew Drops",
            brand: "Glow Recipe",
            category: "Serum",
            price: 35.00,
            rating: 4.7,
            reviewsCount: 16900,
            description: "Multi-use brightening serum that creates an instant reflective glow without mica or glitter, powered by Niacinamide.",
            keyIngredients: ["Niacinamide", "Watermelon", "Hyaluronic Acid"],
            targetConcerns: [.dullness, .dryness, .hyperpigmentation],
            targetSkinTypes: [.dry, .combination, .normal, .sensitive],
            sephoraProductId: "P466123",
            badge: "Glass Skin Choice",
            iconName: "wand.and.stars"
        ),
        
        // Moisturizers
        SephoraProduct(
            id: "tatcha-dewy-cream",
            name: "The Dewy Skin Cream Plumping Moisturizer",
            brand: "Tatcha",
            category: "Moisturizer",
            price: 72.00,
            rating: 4.8,
            reviewsCount: 15100,
            description: "Rich, deeply hydrating cream with antioxidant Japanese purple rice that feeds skin with a luminous, dew-kissed finish.",
            keyIngredients: ["Japanese Purple Rice", "Okinawa Algae Blend", "Hadasei-3 Trinity"],
            targetConcerns: [.dryness, .aging, .dullness],
            targetSkinTypes: [.dry, .combination, .sensitive],
            sephoraProductId: "P441101",
            badge: "Holy Grail Dewy",
            iconName: "sparkle"
        ),
        SephoraProduct(
            id: "drunk-protini",
            name: "Protini Polypeptide Firming Cream",
            brand: "Drunk Elephant",
            category: "Moisturizer",
            price: 68.00,
            rating: 4.6,
            reviewsCount: 17200,
            description: "Protein moisturizer combining signal peptides, growth factors, and amino acids to visibly revive skin bounce and texture.",
            keyIngredients: ["9 Signal Peptide Complex", "Pygmy Waterlily", "Soybean Folic Acid"],
            targetConcerns: [.aging, .dullness, .redness],
            targetSkinTypes: [.oily, .combination, .normal, .dry],
            sephoraProductId: "P427421",
            badge: "Clean Award Winner",
            iconName: "shield.checkerboard"
        ),
        SephoraProduct(
            id: "kiehls-ultra-facial",
            name: "Ultra Facial Cream Moisturizer",
            brand: "Kiehl's Since 1851",
            category: "Moisturizer",
            price: 38.00,
            rating: 4.7,
            reviewsCount: 23500,
            description: "24-hour ultra-lightweight hydration barrier cream with Squalane and Glacial Glycoprotein for ultimate barrier soothing.",
            keyIngredients: ["Squalane", "Glacial Glycoprotein", "Ophiopogon Japonicus Root"],
            targetConcerns: [.dryness, .redness],
            targetSkinTypes: [.sensitive, .dry, .normal, .combination],
            sephoraProductId: "P421996",
            badge: "All-Day Barrier",
            iconName: "heart.fill"
        ),
        
        // Sunscreens
        SephoraProduct(
            id: "supergoop-unseen",
            name: "Unseen Sunscreen SPF 40 PA+++",
            brand: "Supergoop!",
            category: "Sunscreen",
            price: 38.00,
            rating: 4.7,
            reviewsCount: 19800,
            description: "100% invisible, weightless, scentless daily gel SPF 40 that doubles as a makeup-gripping primer with zero white cast.",
            keyIngredients: ["Avobenzone 3%", "Meadowfoam Seed", "Red Algae Extract"],
            targetConcerns: [.aging, .hyperpigmentation, .acne],
            targetSkinTypes: [.oily, .combination, .normal, .dry, .sensitive],
            sephoraProductId: "P428042",
            badge: "#1 Invisible SPF",
            iconName: "sun.max.fill"
        ),
        SephoraProduct(
            id: "innisfree-spf",
            name: "Daily UV Defense Sunscreen Broad Spectrum SPF 36",
            brand: "Innisfree",
            category: "Sunscreen",
            price: 16.00,
            rating: 4.8,
            reviewsCount: 12400,
            description: "Water-light daily sunscreen infused with green tea, cica, and sunflower seed oil for a soothing glow without greasiness.",
            keyIngredients: ["Jeju Green Tea", "Cica Centella", "Sunflower Seed Oil"],
            targetConcerns: [.dryness, .redness, .dullness],
            targetSkinTypes: [.combination, .dry, .sensitive, .normal],
            sephoraProductId: "P456349",
            badge: "Best Value SPF",
            iconName: "sun.circle.fill"
        ),
        
        // Eye Cream & Night Care
        SephoraProduct(
            id: "ole-banana-eye",
            name: "Banana Bright+ Vitamin C Eye Crème",
            brand: "Olehenriksen",
            category: "Eye Care",
            price: 44.00,
            rating: 4.5,
            reviewsCount: 9800,
            description: "Brightening eye cream infused with triple vitamin C and real banana powder-inspired pigments to diminish dark circles immediately.",
            keyIngredients: ["Triple Vitamin C Complex", "Bio-Flavonoids", "Real Banana Pigments"],
            targetConcerns: [.hyperpigmentation, .aging, .dullness],
            targetSkinTypes: [.normal, .dry, .combination],
            sephoraProductId: "P500742",
            badge: "Brightening Winner",
            iconName: "eye.fill"
        ),
        SephoraProduct(
            id: "laneige-lip-mask",
            name: "Lip Sleeping Mask Intense Hydration",
            brand: "Laneige",
            category: "Lip Care",
            price: 24.00,
            rating: 4.8,
            reviewsCount: 34000,
            description: "Leave-on lip mask that delivers intense moisture and antioxidants while you sleep with Berry Fruit Complex and Vitamin C.",
            keyIngredients: ["Berry Fruit Complex", "Vitamin C", "Coconut Oil", "Shea Butter"],
            targetConcerns: [.dryness],
            targetSkinTypes: [.dry, .sensitive, .normal, .oily, .combination],
            sephoraProductId: "P420652",
            badge: "Cult Global Favorite",
            iconName: "mouth.fill"
        )
    ]
}

// MARK: - Routine Recommendation Logic Engine

class RoutineGenerator {
    static func generateRoutine(profile: QuizProfile) -> [RoutineStepItem] {
        var steps: [RoutineStepItem] = []
        
        // Step 1: Cleanser (AM & PM)
        let cleanser: SephoraProduct
        if profile.concern == .acne || profile.skinType == .oily {
            cleanser = SephoraCatalog.products.first(where: { $0.id == "paulas-bha-cleanser" }) ?? SephoraCatalog.products[0]
        } else if profile.skinType == .dry || profile.concern == .redness {
            cleanser = SephoraCatalog.products.first(where: { $0.id == "tatcha-rice-wash" }) ?? SephoraCatalog.products[1]
        } else {
            cleanser = SephoraCatalog.products.first(where: { $0.id == "yttp-cleanser" }) ?? SephoraCatalog.products[0]
        }
        
        steps.append(RoutineStepItem(
            stepNumber: 1,
            timeOfDay: .both,
            title: "Gentle Antioxidant Cleanse",
            categoryName: "Cleanser",
            instructions: "Massage 1 pump onto damp skin for 60 seconds using circular motions. Rinse thoroughly with lukewarm water.",
            proTip: "Never use scalding hot water, as it strips natural lipids and aggravates redness.",
            recommendedProduct: cleanser,
            alternativeProduct: SephoraCatalog.products.first(where: { $0.id == "yttp-cleanser" })
        ))
        
        // Step 2: Toner / Exfoliant (AM/PM based on preference)
        if profile.preference != .minimal {
            let toner: SephoraProduct
            if profile.concern == .acne || profile.concern == .hyperpigmentation {
                toner = SephoraCatalog.products.first(where: { $0.id == "paulas-choice-bha" }) ?? SephoraCatalog.products[3]
            } else {
                toner = SephoraCatalog.products.first(where: { $0.id == "glow-recipe-toner" }) ?? SephoraCatalog.products[4]
            }
            
            steps.append(RoutineStepItem(
                stepNumber: 2,
                timeOfDay: .morning,
                title: "Pore Refining & Dewy Prep",
                categoryName: "Toner & Exfoliant",
                instructions: "Dispense a few drops into palms or a cotton pad. Gently press onto face and neck until absorbed.",
                proTip: "Apply onto slightly damp skin to lock in 3x more hydration.",
                recommendedProduct: toner,
                alternativeProduct: SephoraCatalog.products.first(where: { $0.id == "glow-recipe-toner" })
            ))
        }
        
        // Step 3: Targeted Active Serum
        let serum: SephoraProduct
        switch profile.concern {
        case .acne, .redness:
            serum = SephoraCatalog.products.first(where: { $0.id == "ordinary-niacinamide" }) ?? SephoraCatalog.products[5]
        case .hyperpigmentation, .dullness:
            serum = (profile.goal == .glassSkin) ?
                (SephoraCatalog.products.first(where: { $0.id == "glow-recipe-dew-drops" }) ?? SephoraCatalog.products[8]) :
                (SephoraCatalog.products.first(where: { $0.id == "dunk-c-firma" }) ?? SephoraCatalog.products[6])
        case .aging:
            serum = SephoraCatalog.products.first(where: { $0.id == "sunday-riley-good-genes" }) ?? SephoraCatalog.products[7]
        case .dryness:
            serum = SephoraCatalog.products.first(where: { $0.id == "glow-recipe-dew-drops" }) ?? SephoraCatalog.products[8]
        }
        
        steps.append(RoutineStepItem(
            stepNumber: steps.count + 1,
            timeOfDay: .morning,
            title: "Targeted Treatment & Shield Serum",
            categoryName: "Active Serum",
            instructions: "Apply 3-4 drops evenly across forehead, cheeks, and chin. Tap lightly with fingertips.",
            proTip: "Allow 60 seconds for serum actives to absorb into dermal layers before moisturizer.",
            recommendedProduct: serum,
            alternativeProduct: SephoraCatalog.products.first(where: { $0.id == "ordinary-niacinamide" })
        ))
        
        // Step 4: Eye Cream (for Ultimate Routine)
        if profile.preference == .ultimate {
            if let eyeProduct = SephoraCatalog.products.first(where: { $0.id == "ole-banana-eye" }) {
                steps.append(RoutineStepItem(
                    stepNumber: steps.count + 1,
                    timeOfDay: .both,
                    title: "Illuminating Eye Brightening Treatment",
                    categoryName: "Eye Care",
                    instructions: "Dab a pea-sized amount along orbital bone using your ring finger. Gently tap.",
                    proTip: "Never pull delicate under-eye skin. Ring finger applies the softest natural pressure.",
                    recommendedProduct: eyeProduct,
                    alternativeProduct: nil
                ))
            }
        }
        
        // Step 5: Moisture Barrier Cream
        let moisturizer: SephoraProduct
        if profile.goal == .glassSkin || profile.skinType == .dry {
            moisturizer = SephoraCatalog.products.first(where: { $0.id == "tatcha-dewy-cream" }) ?? SephoraCatalog.products[9]
        } else if profile.concern == .aging || profile.concern == .dullness {
            moisturizer = SephoraCatalog.products.first(where: { $0.id == "drunk-protini" }) ?? SephoraCatalog.products[10]
        } else {
            moisturizer = SephoraCatalog.products.first(where: { $0.id == "kiehls-ultra-facial" }) ?? SephoraCatalog.products[11]
        }
        
        steps.append(RoutineStepItem(
            stepNumber: steps.count + 1,
            timeOfDay: .both,
            title: "Barrier Repair Hydration Seal",
            categoryName: "Moisturizer",
            instructions: "Warm a nickel-sized amount between palms and smooth upward over face and neck.",
            proTip: "Always bring moisturizer down to your neck and décolletage to prevent premature sagging.",
            recommendedProduct: moisturizer,
            alternativeProduct: SephoraCatalog.products.first(where: { $0.id == "kiehls-ultra-facial" })
        ))
        
        // Step 6: Broad Spectrum Sunscreen (AM Only)
        let spf: SephoraProduct
        if profile.skinType == .oily || profile.concern == .acne {
            spf = SephoraCatalog.products.first(where: { $0.id == "supergoop-unseen" }) ?? SephoraCatalog.products[12]
        } else {
            spf = SephoraCatalog.products.first(where: { $0.id == "innisfree-spf" }) ?? SephoraCatalog.products[13]
        }
        
        steps.append(RoutineStepItem(
            stepNumber: steps.count + 1,
            timeOfDay: .morning,
            title: "Invisible Daily UV Shield (SPF 36+)",
            categoryName: "Sunscreen",
            instructions: "Apply two finger-lengths of sunscreen as final step of morning routine 15 mins before sun exposure.",
            proTip: "90% of premature skin aging comes from daily UV rays—SPF is your most important product!",
            recommendedProduct: spf,
            alternativeProduct: SephoraCatalog.products.first(where: { $0.id == "supergoop-unseen" })
        ))
        
        // Step 7: Overnight Recovery Lip Mask (PM Only for Ultimate)
        if profile.preference == .ultimate {
            if let lipProduct = SephoraCatalog.products.first(where: { $0.id == "laneige-lip-mask" }) {
                steps.append(RoutineStepItem(
                    stepNumber: steps.count + 1,
                    timeOfDay: .evening,
                    title: "Overnight Intensive Lip Sleeping Mask",
                    categoryName: "Lip Care",
                    instructions: "Generously coat lips right before sleep. Wipe off excess in morning if needed.",
                    proTip: "Exfoliate lips gently with a warm washcloth before applying for velvet plumpness.",
                    recommendedProduct: lipProduct,
                    alternativeProduct: nil
                ))
            }
        }
        
        return steps
    }
}

// MARK: - State Management & View Models

class AppState: ObservableObject {
    @Published var selectedTab: MainTab = .quiz
    @Published var quizProfile = QuizProfile()
    @Published var savedProducts: Set<String> = []
    @Published var dailyLogs: [DailyLog] = []
    @Published var activeRoutine: [RoutineStepItem] = []
    @Published var affiliateEarningsEst: Double = 142.50
    @Published var affiliateClicks: Int = 38
    
    enum MainTab: String, CaseIterable, Identifiable {
        case quiz = "Skincare Quiz"
        case routine = "My Personalized Routine"
        case sephoraShop = "Sephora Product Shop"
        case habitTracker = "Daily Routine Tracker"
        case skinJournal = "Skin Journal"
        
        var id: String { rawValue }
        
        var icon: String {
            switch self {
            case .quiz: return "sparkles.tv.fill"
            case .routine: return "heart.text.square.fill"
            case .sephoraShop: return "bag.fill"
            case .habitTracker: return "checkmark.circle.fill"
            case .skinJournal: return "book.closed.fill"
            }
        }
    }
    
    init() {
        self.activeRoutine = RoutineGenerator.generateRoutine(profile: quizProfile)
    }
    
    func completeQuiz() {
        quizProfile.completed = true
        activeRoutine = RoutineGenerator.generateRoutine(profile: quizProfile)
        withAnimation(.spring()) {
            selectedTab = .routine
        }
    }
    
    func openSephoraAffiliateLink(product: SephoraProduct) {
        affiliateClicks += 1
        affiliateEarningsEst += product.price * 0.08
        if let url = URL(string: product.affiliateUrl) {
            NSWorkspace.shared.open(url)
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }
}

@main
struct GlowGuideApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            MainContainerView()
                .environmentObject(appState)
                .preferredColorScheme(.dark)
                .frame(minWidth: 1000, minHeight: 700)
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified)
    }
}

// MARK: - Main Container & Sidebar Layout

struct MainContainerView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        NavigationView {
            // Sidebar Navigation
            VStack(alignment: .leading, spacing: 14) {
                // Header Logo & Branding
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(LinearGradient(colors: [Color(red: 0.95, green: 0.45, blue: 0.65), Color(red: 0.85, green: 0.65, blue: 0.40)], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .frame(width: 40, height: 40)
                        Image(systemName: "sparkles")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.white)
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("GLOWGUIDE")
                            .font(.system(size: 17, weight: .black, design: .rounded))
                            .foregroundStyle(LinearGradient(colors: [Color.white, Color(red: 0.95, green: 0.75, blue: 0.85)], startPoint: .leading, endPoint: .trailing))
                        Text("SEPHORA SKINCARE AI")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(Color.white.opacity(0.6))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 8)
                
                Divider()
                    .background(Color.white.opacity(0.15))
                
                // Navigation Items
                VStack(spacing: 6) {
                    ForEach(AppState.MainTab.allCases) { tab in
                        Button(action: {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                appState.selectedTab = tab
                            }
                        }) {
                            HStack(spacing: 12) {
                                Image(systemName: tab.icon)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(appState.selectedTab == tab ? Color(red: 0.98, green: 0.60, blue: 0.75) : Color.white.opacity(0.7))
                                    .frame(width: 22)
                                
                                Text(tab.rawValue)
                                    .font(.system(size: 13, weight: appState.selectedTab == tab ? .bold : .medium))
                                    .foregroundColor(appState.selectedTab == tab ? .white : Color.white.opacity(0.75))
                                
                                Spacer()
                                
                                if tab == .routine && appState.quizProfile.completed {
                                    Circle()
                                        .fill(Color(red: 0.95, green: 0.45, blue: 0.65))
                                        .frame(width: 7, height: 7)
                                }
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(appState.selectedTab == tab ? Color.white.opacity(0.12) : Color.clear)
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.horizontal, 12)
                
                Spacer()
                
                // Sephora Affiliate Monetization Banner Widget
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "bag.circle.fill")
                            .foregroundColor(Color(red: 0.95, green: 0.60, blue: 0.75))
                        Text("SEPHORA AFFILIATE")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.white)
                    }
                    
                    Text("Official recommendations include Sephora affiliate links. Purchases support custom routine generation!")
                        .font(.system(size: 10))
                        .foregroundColor(Color.white.opacity(0.65))
                        .lineLimit(3)
                    
                    HStack {
                        VStack(alignment: .leading) {
                            Text("EST. EARNINGS")
                                .font(.system(size: 8, weight: .semibold))
                                .foregroundColor(Color.white.opacity(0.5))
                            Text("$\(String(format: "%.2f", appState.affiliateEarningsEst))")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(Color(red: 0.40, green: 0.85, blue: 0.60))
                        }
                        Spacer()
                        VStack(alignment: .trailing) {
                            Text("CLICKS")
                                .font(.system(size: 8, weight: .semibold))
                                .foregroundColor(Color.white.opacity(0.5))
                            Text("\(appState.affiliateClicks)")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                        }
                    }
                    .padding(.top, 4)
                }
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(LinearGradient(colors: [Color.black.opacity(0.4), Color(red: 0.25, green: 0.15, blue: 0.25)], startPoint: .top, endPoint: .bottom))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.12), lineWidth: 1))
                )
                .padding(12)
            }
            .frame(minWidth: 230, maxWidth: 260)
            .background(Color(red: 0.08, green: 0.08, blue: 0.11))
            
            // Detail Main Content Area
            ZStack {
                Color(red: 0.05, green: 0.05, blue: 0.07).ignoresSafeArea()
                
                switch appState.selectedTab {
                case .quiz:
                    QuizView()
                case .routine:
                    PersonalizedRoutineView()
                case .sephoraShop:
                    SephoraShopView()
                case .habitTracker:
                    HabitTrackerView()
                case .skinJournal:
                    SkinJournalView()
                }
            }
        }
    }
}

// MARK: - Quiz View Component

struct QuizView: View {
    @EnvironmentObject var appState: AppState
    @State private var currentStep: Int = 0
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                // Header Banner
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("PERSONALIZED BEAUTY QUIZ")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color(red: 0.95, green: 0.60, blue: 0.75))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Capsule().fill(Color(red: 0.95, green: 0.60, blue: 0.75).opacity(0.18)))
                        
                        Spacer()
                        
                        Text("Step \(currentStep + 1) of 4")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Color.white.opacity(0.6))
                    }
                    
                    Text("Find Your Perfect Sephora Routine")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text("Answer 4 quick questions to receive a custom AM/PM skincare regimen tailored to your exact skin concerns with direct Sephora links.")
                        .font(.system(size: 14))
                        .foregroundColor(Color.white.opacity(0.7))
                    
                    // Progress Bar
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule()
                                .fill(Color.white.opacity(0.1))
                                .frame(height: 6)
                            Capsule()
                                .fill(LinearGradient(colors: [Color(red: 0.95, green: 0.45, blue: 0.65), Color(red: 0.95, green: 0.70, blue: 0.40)], startPoint: .leading, endPoint: .trailing))
                                .frame(width: geo.size.width * CGFloat(currentStep + 1) / 4.0, height: 6)
                        }
                    }
                    .frame(height: 6)
                    .padding(.top, 8)
                }
                .padding(24)
                .background(
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Color.white.opacity(0.04))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.white.opacity(0.08), lineWidth: 1))
                )
                
                // Quiz Content Steps
                if currentStep == 0 {
                    // Question 1: Skin Concern
                    VStack(alignment: .leading, spacing: 16) {
                        Text("1. What is your primary skin concern?")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                        
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                            ForEach(SkinConcern.allCases) { concern in
                                Button(action: {
                                    appState.quizProfile.concern = concern
                                }) {
                                    HStack(spacing: 14) {
                                        ZStack {
                                            Circle()
                                                .fill(concern.color.opacity(0.2))
                                                .frame(width: 44, height: 44)
                                            Image(systemName: concern.icon)
                                                .font(.system(size: 20))
                                                .foregroundColor(concern.color)
                                        }
                                        
                                        VStack(alignment: .leading, spacing: 3) {
                                            Text(concern.rawValue)
                                                .font(.system(size: 14, weight: .bold))
                                                .foregroundColor(.white)
                                            Text(concern.description)
                                                .font(.system(size: 11))
                                                .foregroundColor(Color.white.opacity(0.65))
                                                .lineLimit(2)
                                        }
                                        
                                        Spacer()
                                        
                                        if appState.quizProfile.concern == concern {
                                            Image(systemName: "checkmark.circle.fill")
                                                .font(.system(size: 20))
                                                .foregroundColor(Color(red: 0.95, green: 0.45, blue: 0.65))
                                        }
                                    }
                                    .padding(14)
                                    .background(
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(appState.quizProfile.concern == concern ? Color.white.opacity(0.12) : Color.white.opacity(0.04))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 14)
                                                    .stroke(appState.quizProfile.concern == concern ? Color(red: 0.95, green: 0.45, blue: 0.65) : Color.white.opacity(0.08), lineWidth: appState.quizProfile.concern == concern ? 2 : 1)
                                            )
                                    )
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                    }
                } else if currentStep == 1 {
                    // Question 2: Skincare Goal
                    VStack(alignment: .leading, spacing: 16) {
                        Text("2. What are you looking to achieve with your skin?")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                        
                        VStack(spacing: 12) {
                            ForEach(SkincareGoal.allCases) { goal in
                                Button(action: {
                                    appState.quizProfile.goal = goal
                                }) {
                                    HStack(spacing: 16) {
                                        ZStack {
                                            Circle()
                                                .fill(Color(red: 0.95, green: 0.45, blue: 0.65).opacity(0.2))
                                                .frame(width: 44, height: 44)
                                            Image(systemName: goal.icon)
                                                .font(.system(size: 20))
                                                .foregroundColor(Color(red: 0.95, green: 0.65, blue: 0.75))
                                        }
                                        
                                        VStack(alignment: .leading, spacing: 3) {
                                            Text(goal.rawValue)
                                                .font(.system(size: 15, weight: .bold))
                                                .foregroundColor(.white)
                                            Text(goal.subtitle)
                                                .font(.system(size: 12))
                                                .foregroundColor(Color.white.opacity(0.65))
                                        }
                                        
                                        Spacer()
                                        
                                        if appState.quizProfile.goal == goal {
                                            Image(systemName: "checkmark.circle.fill")
                                                .font(.system(size: 22))
                                                .foregroundColor(Color(red: 0.95, green: 0.45, blue: 0.65))
                                        }
                                    }
                                    .padding(16)
                                    .background(
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(appState.quizProfile.goal == goal ? Color.white.opacity(0.12) : Color.white.opacity(0.04))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 14)
                                                    .stroke(appState.quizProfile.goal == goal ? Color(red: 0.95, green: 0.45, blue: 0.65) : Color.white.opacity(0.08), lineWidth: appState.quizProfile.goal == goal ? 2 : 1)
                                            )
                                    )
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                    }
                } else if currentStep == 2 {
                    // Question 3: Skin Type
                    VStack(alignment: .leading, spacing: 16) {
                        Text("3. What is your skin type?")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                        
                        VStack(spacing: 12) {
                            ForEach(SkinType.allCases) { st in
                                Button(action: {
                                    appState.quizProfile.skinType = st
                                }) {
                                    HStack(spacing: 16) {
                                        Image(systemName: st.icon)
                                            .font(.system(size: 20))
                                            .foregroundColor(Color(red: 0.40, green: 0.75, blue: 0.90))
                                            .frame(width: 36)
                                        
                                        Text(st.rawValue)
                                            .font(.system(size: 15, weight: .bold))
                                            .foregroundColor(.white)
                                        
                                        Spacer()
                                        
                                        if appState.quizProfile.skinType == st {
                                            Image(systemName: "checkmark.circle.fill")
                                                .font(.system(size: 20))
                                                .foregroundColor(Color(red: 0.95, green: 0.45, blue: 0.65))
                                        }
                                    }
                                    .padding(16)
                                    .background(
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(appState.quizProfile.skinType == st ? Color.white.opacity(0.12) : Color.white.opacity(0.04))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 14)
                                                    .stroke(appState.quizProfile.skinType == st ? Color(red: 0.95, green: 0.45, blue: 0.65) : Color.white.opacity(0.08), lineWidth: appState.quizProfile.skinType == st ? 2 : 1)
                                            )
                                    )
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                    }
                } else if currentStep == 3 {
                    // Question 4: Routine Complexity
                    VStack(alignment: .leading, spacing: 16) {
                        Text("4. What routine style do you prefer?")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                        
                        VStack(spacing: 14) {
                            ForEach(RoutinePreference.allCases) { pref in
                                Button(action: {
                                    appState.quizProfile.preference = pref
                                }) {
                                    HStack(spacing: 16) {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(pref.rawValue)
                                                .font(.system(size: 16, weight: .bold))
                                                .foregroundColor(.white)
                                            Text("\(pref.stepCount) steps total AM/PM • Takes ~\(pref.stepCount * 2) minutes daily")
                                                .font(.system(size: 12))
                                                .foregroundColor(Color.white.opacity(0.65))
                                        }
                                        
                                        Spacer()
                                        
                                        if appState.quizProfile.preference == pref {
                                            Image(systemName: "checkmark.circle.fill")
                                                .font(.system(size: 22))
                                                .foregroundColor(Color(red: 0.95, green: 0.45, blue: 0.65))
                                        }
                                    }
                                    .padding(18)
                                    .background(
                                        RoundedRectangle(cornerRadius: 14)
                                            .fill(appState.quizProfile.preference == pref ? Color.white.opacity(0.12) : Color.white.opacity(0.04))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 14)
                                                    .stroke(appState.quizProfile.preference == pref ? Color(red: 0.95, green: 0.45, blue: 0.65) : Color.white.opacity(0.08), lineWidth: appState.quizProfile.preference == pref ? 2 : 1)
                                            )
                                    )
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                    }
                }
                
                // Navigation Action Controls
                HStack {
                    if currentStep > 0 {
                        Button(action: {
                            withAnimation { currentStep -= 1 }
                        }) {
                            HStack {
                                Image(systemName: "chevron.left")
                                Text("Previous")
                            }
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 12)
                            .background(RoundedRectangle(cornerRadius: 10).fill(Color.white.opacity(0.1)))
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    
                    Spacer()
                    
                    if currentStep < 3 {
                        Button(action: {
                            withAnimation { currentStep += 1 }
                        }) {
                            HStack {
                                Text("Next Question")
                                Image(systemName: "chevron.right")
                            }
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(LinearGradient(colors: [Color(red: 0.95, green: 0.45, blue: 0.65), Color(red: 0.85, green: 0.55, blue: 0.40)], startPoint: .leading, endPoint: .trailing))
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    } else {
                        Button(action: {
                            appState.completeQuiz()
                        }) {
                            HStack(spacing: 8) {
                                Image(systemName: "sparkles")
                                Text("Generate My Custom Routine")
                            }
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 28)
                            .padding(.vertical, 14)
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(LinearGradient(colors: [Color(red: 0.95, green: 0.45, blue: 0.65), Color(red: 0.85, green: 0.40, blue: 0.55)], startPoint: .leading, endPoint: .trailing))
                                    .shadow(color: Color(red: 0.95, green: 0.45, blue: 0.65).opacity(0.4), radius: 8, x: 0, y: 4)
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding(.top, 12)
            }
            .padding(28)
        }
    }
}

// MARK: - Personalized Routine View

struct PersonalizedRoutineView: View {
    @EnvironmentObject var appState: AppState
    @State private var timeFilter: RoutineStepItem.TimeOfDay = .morning
    
    var filteredSteps: [RoutineStepItem] {
        appState.activeRoutine.filter { step in
            switch timeFilter {
            case .morning:
                return step.timeOfDay == .morning || step.timeOfDay == .both
            case .evening:
                return step.timeOfDay == .evening || step.timeOfDay == .both
            case .both:
                return true
            }
        }
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Top Header Card
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("YOUR CUSTOM SKINCARE REGIMEN")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(Color(red: 0.95, green: 0.60, blue: 0.75))
                            
                            Text("\(appState.quizProfile.goal.rawValue) Plan")
                                .font(.system(size: 26, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                        }
                        
                        Spacer()
                        
                        // Retake Quiz Button
                        Button(action: {
                            withAnimation { appState.selectedTab = .quiz }
                        }) {
                            HStack(spacing: 6) {
                                Image(systemName: "arrow.triangle.2.circlepath")
                                Text("Retake Quiz")
                            }
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color.white.opacity(0.9))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(Capsule().fill(Color.white.opacity(0.12)))
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    
                    // Profile Pills
                    HStack(spacing: 10) {
                        ProfileBadge(icon: appState.quizProfile.concern.icon, title: appState.quizProfile.concern.rawValue)
                        ProfileBadge(icon: appState.quizProfile.skinType.icon, title: "\(appState.quizProfile.skinType.rawValue) Skin")
                        ProfileBadge(icon: "clock.fill", title: appState.quizProfile.preference.rawValue)
                    }
                }
                .padding(20)
                .background(
                    RoundedRectangle(cornerRadius: 18)
                        .fill(LinearGradient(colors: [Color(red: 0.18, green: 0.12, blue: 0.20), Color(red: 0.10, green: 0.08, blue: 0.12)], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.white.opacity(0.1), lineWidth: 1))
                )
                
                // Time Filter Segment Control
                HStack(spacing: 10) {
                    FilterTabButton(title: "Morning Routine (AM)", isSelected: timeFilter == .morning) {
                        timeFilter = .morning
                    }
                    FilterTabButton(title: "Evening Routine (PM)", isSelected: timeFilter == .evening) {
                        timeFilter = .evening
                    }
                    FilterTabButton(title: "All Steps (\(appState.activeRoutine.count))", isSelected: timeFilter == .both) {
                        timeFilter = .both
                    }
                }
                
                // Routine Steps List
                VStack(spacing: 18) {
                    ForEach(filteredSteps) { step in
                        RoutineStepCardView(step: step)
                    }
                }
            }
            .padding(28)
        }
    }
}

struct ProfileBadge: View {
    let icon: String
    let title: String
    
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 11))
                .foregroundColor(Color(red: 0.95, green: 0.65, blue: 0.75))
            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Capsule().fill(Color.white.opacity(0.08)))
    }
}

struct FilterTabButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 13, weight: isSelected ? .bold : .medium))
                .foregroundColor(isSelected ? .white : Color.white.opacity(0.65))
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(
                    Capsule()
                        .fill(isSelected ? Color(red: 0.95, green: 0.45, blue: 0.65) : Color.white.opacity(0.06))
                )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Routine Step Card View with Sephora Recommendations

struct RoutineStepCardView: View {
    let step: RoutineStepItem
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Step Header
            HStack {
                ZStack {
                    Circle()
                        .fill(Color(red: 0.95, green: 0.45, blue: 0.65).opacity(0.2))
                        .frame(width: 36, height: 36)
                    Text("\(step.stepNumber)")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color(red: 0.95, green: 0.65, blue: 0.75))
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(step.title)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("\(step.categoryName) • \(step.timeOfDay.rawValue)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(Color.white.opacity(0.55))
                }
                
                Spacer()
            }
            
            Text(step.instructions)
                .font(.system(size: 13))
                .foregroundColor(Color.white.opacity(0.8))
            
            // Pro Tip Box
            HStack(spacing: 10) {
                Image(systemName: "lightbulb.fill")
                    .foregroundColor(Color(red: 0.95, green: 0.75, blue: 0.35))
                Text(step.proTip)
                    .font(.system(size: 11))
                    .foregroundColor(Color.white.opacity(0.75))
            }
            .padding(10)
            .background(RoundedRectangle(cornerRadius: 8).fill(Color.yellow.opacity(0.08)))
            
            Divider().background(Color.white.opacity(0.1))
            
            // Primary Sephora Product Recommendation Card
            Text("MATCHED SEPHORA RECOMMENDATION")
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color(red: 0.95, green: 0.60, blue: 0.75))
            
            SephoraProductCardView(product: step.recommendedProduct)
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.04))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.08), lineWidth: 1))
        )
    }
}

// MARK: - Sephora Product Card View (With Monetized Affiliate Buttons)

struct SephoraProductCardView: View {
    let product: SephoraProduct
    @EnvironmentObject var appState: AppState
    
    private var ratingBadgeView: some View {
        HStack(spacing: 3) {
            Image(systemName: "star.fill")
                .font(.system(size: 11))
                .foregroundColor(Color.yellow)
            Text(String(format: "%.1f", product.rating))
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white)
            Text("(\(product.reviewsCount))")
                .font(.system(size: 10))
                .foregroundColor(Color.white.opacity(0.5))
        }
    }
    
    private var productDetailsView: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(product.brand.uppercased())
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color.white.opacity(0.5))
                
                if let badge = product.badge {
                    Text(badge)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(Color(red: 0.95, green: 0.45, blue: 0.65))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(Color(red: 0.95, green: 0.45, blue: 0.65).opacity(0.15)))
                }
            }
            
            Text(product.name)
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
            
            HStack(spacing: 8) {
                ratingBadgeView
                Text("•")
                    .foregroundColor(Color.white.opacity(0.3))
                Text("$\(String(format: "%.2f", product.price))")
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundColor(Color(red: 0.40, green: 0.85, blue: 0.60))
            }
            
            HStack(spacing: 4) {
                ForEach(product.keyIngredients.prefix(3), id: \.self) { ing in
                    Text(ing)
                        .font(.system(size: 9))
                        .foregroundColor(Color.white.opacity(0.7))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(RoundedRectangle(cornerRadius: 4).fill(Color.white.opacity(0.08)))
                }
            }
            .padding(.top, 2)
        }
    }
    
    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(LinearGradient(colors: [Color.white.opacity(0.12), Color.white.opacity(0.04)], startPoint: .top, endPoint: .bottom))
                    .frame(width: 72, height: 72)
                
                Image(systemName: product.iconName)
                    .font(.system(size: 32))
                    .foregroundColor(Color(red: 0.95, green: 0.65, blue: 0.75))
            }
            
            productDetailsView
            
            Spacer()
            
            Button(action: {
                appState.openSephoraAffiliateLink(product: product)
            }) {
                VStack(spacing: 4) {
                    HStack(spacing: 4) {
                        Text("Shop Sephora")
                            .font(.system(size: 12, weight: .bold))
                        Image(systemName: "arrow.up.right.square.fill")
                            .font(.system(size: 13))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(LinearGradient(colors: [Color(red: 0.95, green: 0.35, blue: 0.55), Color(red: 0.85, green: 0.25, blue: 0.45)], startPoint: .top, endPoint: .bottom))
                    )
                    
                    Text("8% Affiliate Link")
                        .font(.system(size: 8))
                        .foregroundColor(Color.white.opacity(0.45))
                }
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(Color.white.opacity(0.04))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.06), lineWidth: 1))
        )
    }
}

// MARK: - Sephora Shop & Full Catalog View

struct SephoraShopView: View {
    @EnvironmentObject var appState: AppState
    @State private var searchText: String = ""
    @State private var selectedCategory: String = "All"
    
    let categories = ["All", "Cleanser", "Toner & Exfoliant", "Serum", "Moisturizer", "Sunscreen", "Eye Care", "Lip Care"]
    
    var filteredProducts: [SephoraProduct] {
        SephoraCatalog.products.filter { p in
            let matchesCategory = (selectedCategory == "All" || p.category == selectedCategory)
            let matchesSearch = searchText.isEmpty || p.name.localizedCaseInsensitiveContains(searchText) || p.brand.localizedCaseInsensitiveContains(searchText)
            return matchesCategory && matchesSearch
        }
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                // Header
                VStack(alignment: .leading, spacing: 6) {
                    Text("SEPHORA PRODUCT CATALOG & AFFILIATE HUB")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(red: 0.95, green: 0.60, blue: 0.75))
                    
                    Text("Explore Sephora Best-Sellers")
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text("Curated, dermatologist-backed products available directly on Sephora with monetized affiliate tracking.")
                        .font(.system(size: 13))
                        .foregroundColor(Color.white.opacity(0.65))
                }
                
                // Search Bar & Filters
                HStack(spacing: 12) {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(Color.white.opacity(0.5))
                        TextField("Search brand, product, or active ingredients...", text: $searchText)
                            .textFieldStyle(PlainTextFieldStyle())
                            .foregroundColor(.white)
                    }
                    .padding(12)
                    .background(RoundedRectangle(cornerRadius: 12).fill(Color.white.opacity(0.08)))
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(categories, id: \.self) { cat in
                                Button(action: { selectedCategory = cat }) {
                                    Text(cat)
                                        .font(.system(size: 12, weight: selectedCategory == cat ? .bold : .medium))
                                        .foregroundColor(selectedCategory == cat ? .white : Color.white.opacity(0.7))
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(Capsule().fill(selectedCategory == cat ? Color(red: 0.95, green: 0.45, blue: 0.65) : Color.white.opacity(0.08)))
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                    }
                }
                
                // Product Grid
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ForEach(filteredProducts) { product in
                        SephoraProductCardView(product: product)
                    }
                }
            }
            .padding(28)
        }
    }
}

// MARK: - Daily Habit Tracker View

struct HabitTrackerView: View {
    @EnvironmentObject var appState: AppState
    @State private var completedAM: Set<String> = []
    @State private var completedPM: Set<String> = []
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("DAILY ROUTINE CONSISTENCY")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(red: 0.95, green: 0.60, blue: 0.75))
                    
                    Text("Skincare Habit Tracker")
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text("Consistency is key to glowing skin. Check off your steps daily to maintain your streak!")
                        .font(.system(size: 13))
                        .foregroundColor(Color.white.opacity(0.65))
                }
                
                // Streak Card
                HStack(spacing: 20) {
                    HStack(spacing: 12) {
                        Image(systemName: "flame.fill")
                            .font(.system(size: 36))
                            .foregroundColor(Color(red: 1.0, green: 0.5, blue: 0.2))
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("5 DAY STREAK!")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                            Text("You're building radiant skin habits")
                                .font(.system(size: 12))
                                .foregroundColor(Color.white.opacity(0.65))
                        }
                    }
                    
                    Spacer()
                    
                    VStack {
                        Text("\(completedAM.count + completedPM.count) / \(appState.activeRoutine.count * 2)")
                            .font(.system(size: 22, weight: .black))
                            .foregroundColor(Color(red: 0.40, green: 0.85, blue: 0.60))
                        Text("Today's Steps")
                            .font(.system(size: 10))
                            .foregroundColor(Color.white.opacity(0.5))
                    }
                }
                .padding(20)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(LinearGradient(colors: [Color(red: 0.25, green: 0.12, blue: 0.18), Color(red: 0.12, green: 0.08, blue: 0.14)], startPoint: .leading, endPoint: .trailing))
                        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.white.opacity(0.1), lineWidth: 1))
                )
                
                // Morning Section
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "sun.max.fill")
                            .foregroundColor(.yellow)
                        Text("Morning Routine Checklist (AM)")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    }
                    
                    VStack(spacing: 10) {
                        ForEach(appState.activeRoutine.filter { $0.timeOfDay == .morning || $0.timeOfDay == .both }) { step in
                            Button(action: {
                                if completedAM.contains(step.id.uuidString) {
                                    completedAM.remove(step.id.uuidString)
                                } else {
                                    completedAM.insert(step.id.uuidString)
                                }
                            }) {
                                HStack {
                                    Image(systemName: completedAM.contains(step.id.uuidString) ? "checkmark.square.fill" : "square")
                                        .font(.system(size: 20))
                                        .foregroundColor(completedAM.contains(step.id.uuidString) ? Color(red: 0.40, green: 0.85, blue: 0.60) : Color.white.opacity(0.4))
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(step.title)
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.white)
                                            .strikethrough(completedAM.contains(step.id.uuidString))
                                        Text("Product: \(step.recommendedProduct.brand) \(step.recommendedProduct.name)")
                                            .font(.system(size: 11))
                                            .foregroundColor(Color.white.opacity(0.6))
                                    }
                                    
                                    Spacer()
                                }
                                .padding(12)
                                .background(RoundedRectangle(cornerRadius: 10).fill(Color.white.opacity(0.04)))
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                }
                
                // Evening Section
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: "moon.stars.fill")
                            .foregroundColor(Color(red: 0.70, green: 0.60, blue: 0.95))
                        Text("Evening Routine Checklist (PM)")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    }
                    
                    VStack(spacing: 10) {
                        ForEach(appState.activeRoutine.filter { $0.timeOfDay == .evening || $0.timeOfDay == .both }) { step in
                            Button(action: {
                                if completedPM.contains(step.id.uuidString) {
                                    completedPM.remove(step.id.uuidString)
                                } else {
                                    completedPM.insert(step.id.uuidString)
                                }
                            }) {
                                HStack {
                                    Image(systemName: completedPM.contains(step.id.uuidString) ? "checkmark.square.fill" : "square")
                                        .font(.system(size: 20))
                                        .foregroundColor(completedPM.contains(step.id.uuidString) ? Color(red: 0.40, green: 0.85, blue: 0.60) : Color.white.opacity(0.4))
                                    
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(step.title)
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.white)
                                            .strikethrough(completedPM.contains(step.id.uuidString))
                                        Text("Product: \(step.recommendedProduct.brand) \(step.recommendedProduct.name)")
                                            .font(.system(size: 11))
                                            .foregroundColor(Color.white.opacity(0.6))
                                    }
                                    
                                    Spacer()
                                }
                                .padding(12)
                                .background(RoundedRectangle(cornerRadius: 10).fill(Color.white.opacity(0.04)))
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                }
            }
            .padding(28)
        }
    }
}

// MARK: - Skin Journal View Component

struct SkinJournalView: View {
    @State private var journalText: String = ""
    @State private var hydrationSlider: Double = 7.0
    @State private var notesHistory: [String] = [
        "Day 1: Started the Tatcha Dewy Cream & Youth To The People cleanser. Skin feels instantly smoother!",
        "Day 3: Paula's Choice BHA helped clear up minor chin congestion. Zero irritation observed."
    ]
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("SKIN PROGRESS JOURNAL")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(red: 0.95, green: 0.60, blue: 0.75))
                    
                    Text("Track Your Glow Journey")
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text("Document how your skin reacts to your Sephora product routine over time.")
                        .font(.system(size: 13))
                        .foregroundColor(Color.white.opacity(0.65))
                }
                
                // Add Log Entry Form
                VStack(alignment: .leading, spacing: 14) {
                    Text("Log Today's Skin Condition")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Hydration Level: \(Int(hydrationSlider))/10")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color.white.opacity(0.8))
                        
                        Slider(value: $hydrationSlider, in: 1...10, step: 1)
                            .accentColor(Color(red: 0.95, green: 0.45, blue: 0.65))
                    }
                    
                    TextEditor(text: $journalText)
                        .frame(height: 80)
                        .padding(8)
                        .background(RoundedRectangle(cornerRadius: 10).fill(Color.white.opacity(0.06)))
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.white.opacity(0.1), lineWidth: 1))
                    
                    Button(action: {
                        if !journalText.isEmpty {
                            notesHistory.insert("Day \(notesHistory.count + 1): \(journalText)", at: 0)
                            journalText = ""
                        }
                    }) {
                        Text("Save Journal Entry")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .background(RoundedRectangle(cornerRadius: 10).fill(Color(red: 0.95, green: 0.45, blue: 0.65)))
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(18)
                .background(RoundedRectangle(cornerRadius: 14).fill(Color.white.opacity(0.04)))
                
                // History List
                VStack(alignment: .leading, spacing: 12) {
                    Text("Past Entries")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    
                    ForEach(notesHistory, id: \.self) { note in
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: "quote.bubble.fill")
                                .foregroundColor(Color(red: 0.95, green: 0.65, blue: 0.75))
                            Text(note)
                                .font(.system(size: 13))
                                .foregroundColor(Color.white.opacity(0.85))
                        }
                        .padding(14)
                        .background(RoundedRectangle(cornerRadius: 10).fill(Color.white.opacity(0.03)))
                    }
                }
            }
            .padding(28)
        }
    }
}

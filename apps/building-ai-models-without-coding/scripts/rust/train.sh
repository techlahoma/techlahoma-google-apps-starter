#!/bin/sh
# Run the prepared WASM Rust toolchain in Bun; no Xcode/native Rust needed.
set -eu
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
source_path=${1:-"$script_dir/../../public/rust/tiny-gpt.rs"}
exec bun "$script_dir/run-cli.ts" "$source_path"

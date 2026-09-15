param([string]$Source = "$PSScriptRoot/../../public/rust/tiny-gpt.rs")
$ErrorActionPreference = 'Stop'
# Run the prepared WASM Rust toolchain in Bun; no native compiler needed.
& bun "$PSScriptRoot/run-cli.ts" $Source
exit $LASTEXITCODE

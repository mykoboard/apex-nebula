# Justfile for Apex Nebula Game Package Environment
# Runs all tools via containerized Docker environments (Bun + Rust).

default:
    @just --list

IMAGE := "oven/bun:1-alpine"
RUST_IMAGE := "rust:1-slim"
USER_FLAG := "--user 1000:1000"

# Install dependencies inside Bun container
install:
    docker run --rm {{USER_FLAG}} -v "{{justfile_directory()}}:/app" -w /app {{IMAGE}} bun install

# Run TypeScript tests
test *args:
    docker run --rm {{USER_FLAG}} -v "{{justfile_directory()}}:/app" -w /app {{IMAGE}} bun test {{args}}

# Run Rust engine tests
test-wasm *args:
    docker run --rm {{USER_FLAG}} -e CARGO_HOME=/tmp/cargo -v "{{justfile_directory()}}:/app" -w /app/engine {{RUST_IMAGE}} cargo test {{args}}

# Build Rust WASM rules engine
build-wasm:
    docker run --rm {{USER_FLAG}} -e CARGO_HOME=/tmp/cargo -v "{{justfile_directory()}}:/app" -w /app/engine {{RUST_IMAGE}} sh -c "rustup target add wasm32-unknown-unknown && cargo build --target wasm32-unknown-unknown --release"

# Build and package game into fully local self-contained .bgw.json bundle
package:
    @just build-wasm
    @just build
    docker run --rm {{USER_FLAG}} -v "{{justfile_directory()}}:/app" -w /app {{IMAGE}} bun run scripts/package-game.ts

# Build frontend production bundle
build:
    docker run --rm {{USER_FLAG}} -v "{{justfile_directory()}}:/app" -w /app {{IMAGE}} bun run build

# Run TypeScript type check
check:
    docker run --rm {{USER_FLAG}} -v "{{justfile_directory()}}:/app" -w /app {{IMAGE}} bun x vue-tsc --noEmit

# Launch containerized dev server
dev:
    docker run --rm {{USER_FLAG}} -it -p 5173:5173 -v "{{justfile_directory()}}:/app" -w /app {{IMAGE}} bun run dev -- --host 0.0.0.0

# Run arbitrary Bun CLI command in container
bun *args:
    docker run --rm {{USER_FLAG}} -it -v "{{justfile_directory()}}:/app" -w /app {{IMAGE}} bun {{args}}

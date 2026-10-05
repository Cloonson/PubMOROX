#!/usr/bin/env python3
"""Generates latest.json for Tauri v2 updater from built bundle artifacts."""
import json, sys, os, glob, datetime

bundles_dir = sys.argv[1]
version = sys.argv[2]
repo = "https://github.com/Cloonson/PubMOROX"
tag = f"v{version}"
base_url = f"{repo}/releases/download/{tag}"

def read_sig(path):
    with open(path) as f:
        return f.read().strip()

def find_one(pattern):
    matches = glob.glob(pattern, recursive=True)
    if matches:
        print(f"  found: {matches[0]}", file=sys.stderr)
    return matches[0] if matches else None

platforms = {}

# macOS aarch64 (renamed to MOROX_aarch64.app.tar.gz)
sig = find_one(f"{bundles_dir}/bundle-aarch64-apple-darwin/macos/*_aarch64.app.tar.gz.sig")
tar = find_one(f"{bundles_dir}/bundle-aarch64-apple-darwin/macos/*_aarch64.app.tar.gz")
if sig and tar:
    platforms["darwin-aarch64"] = {
        "signature": read_sig(sig),
        "url": f"{base_url}/{os.path.basename(tar)}"
    }
    print(f"✓ darwin-aarch64", file=sys.stderr)

# macOS x86_64 (renamed to MOROX_x86_64.app.tar.gz)
sig = find_one(f"{bundles_dir}/bundle-x86_64-apple-darwin/macos/*_x86_64.app.tar.gz.sig")
tar = find_one(f"{bundles_dir}/bundle-x86_64-apple-darwin/macos/*_x86_64.app.tar.gz")
if sig and tar:
    platforms["darwin-x86_64"] = {
        "signature": read_sig(sig),
        "url": f"{base_url}/{os.path.basename(tar)}"
    }
    print(f"✓ darwin-x86_64", file=sys.stderr)

# Keep the installed Windows bundle type. Switching MSI -> NSIS can create a
# second installation while existing shortcuts still launch the old MSI copy.
# Tauri prefers OS-ARCH-INSTALLER over the generic OS-ARCH key.
for installer, directory, extension in (("nsis", "nsis", "exe"), ("msi", "msi", "msi")):
    artifacts = glob.glob(f"{bundles_dir}/bundle-windows/{directory}/*.{extension}")
    if len(artifacts) != 1:
        sys.exit(f"ERROR: expected exactly one Windows {installer} artifact, found {len(artifacts)}")
    artifact = artifacts[0]
    sig = f"{artifact}.sig"
    if not os.path.isfile(sig) or not read_sig(sig):
        sys.exit(f"ERROR: missing or empty signature for {artifact}")
    platforms[f"windows-x86_64-{installer}"] = {
        "signature": read_sig(sig),
        "url": f"{base_url}/{os.path.basename(artifact)}"
    }
    print(f"✓ windows-x86_64-{installer}", file=sys.stderr)

# Compatibility for clients that do not yet select an installer-specific key.
platforms["windows-x86_64"] = platforms["windows-x86_64-nsis"]

out = {
    "version": version,
    "notes": f"MOROX {version}",
    "pub_date": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "platforms": platforms
}

with open("latest.json", "w") as f:
    json.dump(out, f, indent=2)

print(f"\nPlatforms in latest.json: {list(platforms.keys())}", file=sys.stderr)
if not platforms:
    print("ERROR: no platforms found!", file=sys.stderr)
    sys.exit(1)

#!/usr/bin/env python3
"""Generates latest.json for Tauri v2 updater from built bundle artifacts."""
import json, sys, os, glob, datetime

bundles_dir = sys.argv[1]
version = sys.argv[2]
repo = "https://github.com/Cloonson/MOROX"
tag = f"v{version}"
base_url = f"{repo}/releases/download/{tag}"

def read_sig(path):
    with open(path) as f:
        return f.read().strip()

def find_one(pattern):
    matches = glob.glob(pattern, recursive=True)
    return matches[0] if matches else None

platforms = {}

# macOS aarch64
sig = find_one(f"{bundles_dir}/bundle-aarch64-apple-darwin/macos/*.app.tar.gz.sig")
tar = find_one(f"{bundles_dir}/bundle-aarch64-apple-darwin/macos/*.app.tar.gz")
if sig and tar:
    platforms["darwin-aarch64"] = {
        "signature": read_sig(sig),
        "url": f"{base_url}/{os.path.basename(tar)}"
    }
    print(f"✓ darwin-aarch64: {os.path.basename(tar)}", file=sys.stderr)

# macOS x86_64
sig = find_one(f"{bundles_dir}/bundle-x86_64-apple-darwin/macos/*.app.tar.gz.sig")
tar = find_one(f"{bundles_dir}/bundle-x86_64-apple-darwin/macos/*.app.tar.gz")
if sig and tar:
    platforms["darwin-x86_64"] = {
        "signature": read_sig(sig),
        "url": f"{base_url}/{os.path.basename(tar)}"
    }
    print(f"✓ darwin-x86_64: {os.path.basename(tar)}", file=sys.stderr)

# Windows — prefer NSIS .exe, fallback MSI
for pattern in ["nsis/*.exe", "msi/*.msi"]:
    installer = find_one(f"{bundles_dir}/bundle-windows/{pattern}")
    sig = find_one(f"{bundles_dir}/bundle-windows/{pattern}.sig")
    if installer and sig:
        platforms["windows-x86_64"] = {
            "signature": read_sig(sig),
            "url": f"{base_url}/{os.path.basename(installer)}"
        }
        print(f"✓ windows-x86_64: {os.path.basename(installer)}", file=sys.stderr)
        break

out = {
    "version": version,
    "notes": f"MOROX {version}",
    "pub_date": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "platforms": platforms
}

with open("latest.json", "w") as f:
    json.dump(out, f, indent=2)

print(f"Platforms: {list(platforms.keys())}", file=sys.stderr)
if not platforms:
    print("WARNING: no platforms found!", file=sys.stderr)
    sys.exit(1)

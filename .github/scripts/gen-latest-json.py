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

# Windows — NSIS .exe + .exe.sig
sig = find_one(f"{bundles_dir}/bundle-windows/nsis/*.exe.sig")
exe = find_one(f"{bundles_dir}/bundle-windows/nsis/*.exe")
if sig and exe:
    platforms["windows-x86_64"] = {
        "signature": read_sig(sig),
        "url": f"{base_url}/{os.path.basename(exe)}"
    }
    print(f"✓ windows-x86_64", file=sys.stderr)
else:
    # Fallback: MSI
    sig = find_one(f"{bundles_dir}/bundle-windows/msi/*.msi.sig")
    msi = find_one(f"{bundles_dir}/bundle-windows/msi/*.msi")
    if sig and msi:
        platforms["windows-x86_64"] = {
            "signature": read_sig(sig),
            "url": f"{base_url}/{os.path.basename(msi)}"
        }
        print(f"✓ windows-x86_64 (msi)", file=sys.stderr)

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

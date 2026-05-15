#!/usr/bin/env python3
"""Generates latest.json for Tauri updater from built bundle artifacts."""
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

# macOS x86_64
sig = find_one(f"{bundles_dir}/bundle-x86_64-apple-darwin/macos/*.app.tar.gz.sig")
tar = find_one(f"{bundles_dir}/bundle-x86_64-apple-darwin/macos/*.app.tar.gz")
if sig and tar:
    platforms["darwin-x86_64"] = {
        "signature": read_sig(sig),
        "url": f"{base_url}/{os.path.basename(tar)}"
    }

# Windows x86_64 — prefer NSIS, fallback MSI
for ext in ["nsis/*.exe.zip", "msi/*.msi.zip"]:
    sig = find_one(f"{bundles_dir}/bundle-x86_64-pc-windows-msvc/{ext}.sig")
    archive = find_one(f"{bundles_dir}/bundle-x86_64-pc-windows-msvc/{ext}")
    if sig and archive:
        platforms["windows-x86_64"] = {
            "signature": read_sig(sig),
            "url": f"{base_url}/{os.path.basename(archive)}"
        }
        break

out = {
    "version": version,
    "notes": f"MOROX {version}",
    "pub_date": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "platforms": platforms
}

print(json.dumps(out, indent=2))
with open("latest.json", "w") as f:
    json.dump(out, f, indent=2)

print(f"Generated latest.json with platforms: {list(platforms.keys())}", file=sys.stderr)

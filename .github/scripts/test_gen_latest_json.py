"""Regression tests for Windows update artifact routing. No third-party deps."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

GENERATOR = Path(__file__).with_name("gen-latest-json.py").resolve()


class WindowsUpdaterManifestTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.bundles = self.root / "bundles"
        self.exe = self.add_artifact("nsis", "MOROX_0.2.5_x64-setup.exe", "nsis-signature")
        self.msi = self.add_artifact("msi", "MOROX_0.2.5_x64_en-US.msi", "msi-signature")

    def add_artifact(self, directory, filename, signature):
        artifact = self.bundles / "bundle-windows" / directory / filename
        artifact.parent.mkdir(parents=True, exist_ok=True)
        artifact.write_bytes(b"installer fixture")
        Path(f"{artifact}.sig").write_text(signature)
        return artifact

    def generate(self):
        return subprocess.run(
            [sys.executable, str(GENERATOR), str(self.bundles), "0.2.5"],
            cwd=self.root, capture_output=True, text=True,
        )

    def test_routes_each_installed_bundle_type_to_its_own_installer(self):
        result = self.generate()
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = json.loads((self.root / "latest.json").read_text())
        platforms = manifest["platforms"]
        for installer, artifact, signature in (
            ("nsis", self.exe, "nsis-signature"),
            ("msi", self.msi, "msi-signature"),
        ):
            entry = platforms[f"windows-x86_64-{installer}"]
            self.assertEqual(entry["signature"], signature)
            self.assertEqual(entry["url"], f"https://github.com/Cloonson/PubMOROX/releases/download/v0.2.5/{artifact.name}")
        self.assertEqual(platforms["windows-x86_64"], platforms["windows-x86_64-nsis"])

    def test_preserves_mac_targets(self):
        for arch in ("aarch64", "x86_64"):
            directory = self.bundles / f"bundle-{arch}-apple-darwin" / "macos"
            directory.mkdir(parents=True)
            artifact = directory / f"MOROX_{arch}.app.tar.gz"
            artifact.write_bytes(b"app fixture")
            Path(f"{artifact}.sig").write_text(f"{arch}-signature")
        result = self.generate()
        self.assertEqual(result.returncode, 0, result.stderr)
        platforms = json.loads((self.root / "latest.json").read_text())["platforms"]
        for arch in ("aarch64", "x86_64"):
            self.assertEqual(platforms[f"darwin-{arch}"]["signature"], f"{arch}-signature")

    def test_rejects_missing_msi_instead_of_switching_installers(self):
        self.msi.unlink()
        self.assert_failed("expected exactly one Windows msi artifact")

    def test_rejects_missing_matching_signature(self):
        Path(f"{self.exe}.sig").rename(self.exe.parent / "unrelated.exe.sig")
        self.assert_failed("missing or empty signature")

    def test_rejects_empty_signature(self):
        Path(f"{self.msi}.sig").write_text("\n")
        self.assert_failed("missing or empty signature")

    def test_rejects_ambiguous_installer_versions(self):
        self.add_artifact("nsis", "MOROX_0.2.4_x64-setup.exe", "old-signature")
        self.assert_failed("expected exactly one Windows nsis artifact")

    def assert_failed(self, expected_error):
        result = self.generate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(expected_error, result.stderr)
        self.assertFalse((self.root / "latest.json").exists())


if __name__ == "__main__":
    unittest.main()

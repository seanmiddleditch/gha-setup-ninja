setup-ninja
==============

[GitHub Action](https://github.com/features/actions) for installing ninja into
the `PATH` for the job.

This downloads the official binaries from the [ninja-build](https://github.com/ninja-build/ninja)
repository rather than using a package manager.

Supports Windows, Linux, and macOS.

Inputs:

- `version`: Version of ninja to install (default: 1.11.1)
- `platform`: Override platform detection logic
- `destination`: Target directory for download, added to `PATH`
  (default: `${GITHUB_WORKSPACE}/ninja-build`)
- `http_proxy`: Optional proxy server hostname

License
-------

MIT License. See [LICENSE](LICENSE) for details.

Usage Example
-------------

```yaml
jobs:
  publish:
    - uses: actions/checkout@master
    - uses: seanmiddleditch/gha-setup-ninja@master
    - run: |
      mkdir build
      cd build
      cmake -G Ninja ..
    - run: cmake --build build
```

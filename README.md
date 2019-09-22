setup-ninja
==============

[GitHub Action](https://github.com/features/actions) for installing ninja into
the path for the job.


See [action.yml](https://github.com/potatoengine/ghactions/blob/master/setup-ninja/action.yml)
for a complete list of inputs and outputs.

License
-------

MIT License, see [LICENSE](https://github.com/potatoengine/ghactions/blob/master/setup-ninja/LICENSE)
for details.

Usage Example
-------------

```
jobs:
  publish:
    - uses: actions/checkout@master
    - uses: potatoengine/ghactions/setup-ninja@v3
    - run: mkdir build && cd build && cmake -G Ninja ..
```
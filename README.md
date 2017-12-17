## js-codemod

This repository contains a collection of codemod scripts for use with
[JSCodeshift](https://github.com/facebook/jscodeshift).

### Setup & Run

```sh
npm install -g jscodeshift
git clone https://github.com/gilbarbara/js-codemod.git
jscodeshift -t <codemod-script> <file>
```

Use the `-d` option for a dry-run and use `-p` to print the output for
comparison.

### Included Scripts

#### `epic-to-saga`

```sh
jscodeshift -t js-codemod/transforms/epic-to-saga.js <file>
```

### Recast Options

[Options to recast's printer](https://github.com/benjamn/recast/blob/master/lib/options.js) can be provided
through the `printOptions` command line argument

```sh
jscodeshift -t transform.js <file> --printOptions='{"quote":"double"}'
```
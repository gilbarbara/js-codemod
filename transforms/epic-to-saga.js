module.exports = (file, api, options) => {
  const j = api.jscodeshift;
  const printOptions = options.printOptions || { quote: 'single', tabWidth: 2, trailingComma: true };
  const root = j(file.source);
  const requests = [];

  const getMap = (p) => {
    let mapper = j(p)
      .find(j.CallExpression, {
        callee: {
          property: {
            name: 'switchMap',
          },
        },
      });

    if (!mapper.length) {
      mapper = j(p)
        .find(j.CallExpression, {
          callee: {
            property: {
              name: 'mergeMap',
            },
          },
        });
    }

    return mapper;
  };

  const getParams = (p) => getMap(p)
    .get(0)
    .node.arguments[0].params;

  const setRequestAction = (p) => {
    requests.push([
      getMap(p).get(0).node.callee.object.arguments[0],
      j.identifier(p.value.declaration.id.name),
    ]);
  };

  const getSuccessAction = (p) => j(p)
    .find(j.CallExpression, {
      callee: {
        property: {
          name: 'map',
        },
      },
    })
    .get(0)
    .node.arguments[0].body;

  const getFailureAction = (p) => j(p)
    .find(j.CallExpression, {
      callee: {
        property: {
          name: 'catch',
        },
      },
    })
    .get(0)
    .node.arguments[0].body.elements[0];

  const getApiOptions = (p) => j(p)
    .find(j.CallExpression, {
      callee: {
        name: 'rxAjax',
      },
    })
    .get(0)
    .node.arguments[0];

  const getBody = (p) => getMap(p)
    .find(j.VariableDeclaration);

  const genBlock = (p) => {
    const variables = getBody(p);

    const block = [
      j.tryStatement(
        j.blockStatement([
          j.variableDeclaration('const', [
            j.variableDeclarator(
              j.identifier('data'),
              j.yieldExpression(j.callExpression(j.identifier('call'), [
                j.identifier('request'),
                getApiOptions(p),
              ])),
            ),
          ]),
          j.expressionStatement(j.yieldExpression(j.callExpression(j.identifier('put'), [getSuccessAction(p)]))),
        ]),
        j.catchClause(
          j.identifier('error'),
          null,
          j.blockStatement([
            j.expressionStatement(j.yieldExpression(j.callExpression(j.identifier('put'), [
              getFailureAction(p),
            ]))),
          ])
        )
      ),
    ];

    if (variables.size() > 0) {
      block.unshift(variables.get(0).node);
    }

    return j.blockStatement(block);
  };

  const genDefaultExport = () => {
    const calls = requests.map(d => j.callExpression(j.identifier('takeLatest'), [
      d[0],
      d[1]
    ]));

    const fn = j.exportDefaultDeclaration(j.functionDeclaration(
      j.identifier('root'),
      [],
      j.blockStatement([
        j.expressionStatement(j.yieldExpression(j.callExpression(j.identifier('all'), [
          j.arrayExpression(calls),
        ]))),
      ]),
    ));
    fn.declaration.generator = true;

    return fn;
  };

  root
    .find(j.ExportNamedDeclaration, {
      declaration: {
        generator: false,
      },
    })
    .forEach(p => {
      setRequestAction(p);
      p.value.declaration.generator = true;
      p.value.declaration.params = getParams(p);

      p.value.declaration.body = genBlock(p);

      return p;
    });

  root.find(j.Program).__paths[0].value.body.push(genDefaultExport());

  return root.toSource(printOptions);
};

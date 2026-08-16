const solidReactivity = {
  rules: {
    "two-argument-create-effect": {
      meta: {
        type: "problem",
        docs: {
          description: "Require the Solid 2 createEffect dependency and apply functions",
        },
        schema: [],
        messages: {
          missingApply: "Solid 2 createEffect requires a dependency function and an apply function.",
        },
      },
      create(context) {
        return {
          CallExpression(node) {
            if (node.callee.type !== "Identifier" || node.callee.name !== "createEffect") return;
            if (node.arguments.length !== 1) return;

            context.report({
              node,
              messageId: "missingApply",
            });
          },
        };
      },
    },
    "no-story-alias": {
      meta: {
        type: "problem",
        docs: {
          description: "Require Storybook exports to represent distinct rendered stories",
        },
        schema: [],
        messages: {
          storyAlias: "Story exports must render distinct states; do not alias another story export.",
        },
      },
      create(context) {
        const filename = context.filename;
        if (!/\.stories\.[cm]?[jt]sx?$/.test(filename)) return {};

        return {
          VariableDeclarator(node) {
            if (node.init?.type !== "Identifier") return;
            if (node.parent?.type !== "VariableDeclaration") return;
            if (node.parent.parent?.type !== "ExportNamedDeclaration") return;

            context.report({
              node,
              messageId: "storyAlias",
            });
          },
        };
      },
    },
  },
};

export default solidReactivity;

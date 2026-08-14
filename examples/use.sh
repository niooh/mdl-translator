node dist/cli.js examples/basic.mdl --out ./dist/test-output --serve

# 或分别转换并查看输出
: <<'EOF'
node dist/cli.js examples/code_blocks.mdl --out ./dist/test-output --serve

node dist/cli.js examples/nested.mdl --out ./dist/test-output --serve

# test error
node dist/cli.js examples/test_error.mdl --out ./dist/test-output --serve
EOF

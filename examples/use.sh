node dist/cli.js examples/basic.mdl --out ./dist/test-output --serve

# or convert and view outputs separately
: <<'EOF'
node dist/cli.js examples/code_blocks.mdl --out ./dist/test-output --serve

node dist/cli.js examples/nested.mdl --out ./dist/test-output --serve

# test error
node dist/cli.js examples/test_error.mdl --out ./dist/test-output --serve

# quiz
node dist/cli.js examples/code_blocks.mdl --out-quiz ./dist/test-output --serve

# view
node dist/cli.js examples/code_blocks.mdl --view-title
EOF

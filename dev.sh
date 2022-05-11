[[ -d node_modules ]] || npm i
find . -type f \
  | grep -v -E "(node_modules|.git|.data)" \
  | entr -c sh -c 'rm -rf .data/*; node test.js'

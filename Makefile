build:
	nice public.nice public

serve:
	node --trace-warnings index.js

test: build serve

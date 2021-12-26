build:
	nice public.nice public

serve:
	node index.js

test: build serve

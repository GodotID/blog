const fs = require('fs');
const md = require('markdown-it')();

const { Deta } = require('deta');
const express = require('express')

const deta = Deta(process.env.DETATOKEN || "");
const articles = deta.Base('articles');
const app = express();

app.use(express.static('public'));
app.get('/', (req, res) => res.send('Hello World!'));

app.get('/:article', async (req, res) => {
	let template = '';
	let article = await articles.get(req.params.article);
	if (!article) {
		return res.sendFile(`${__dirname}/public/404.html`);
	}
	let { content, title } = article;

	try {
		template = fs.readFileSync(`${__dirname}/public/article.html`);
	} catch (e) {
		return res.status(500).end("Server error (1)");
	}

	content = md.render(`# ${title}\n${content}`);

	template = template.toString().replace('{content-here}', content);
	template = template.toString().replace('{content-title}', title);
	res.set('Content-Type', 'text/html');
	res.send(Buffer.from(template, 'utf8'));
});

if (process.env.USER == "hanz") {
	app.listen(8080, async () => {
		console.log("Ran at 8080");
	});
} else {
	module.exports = app;
}

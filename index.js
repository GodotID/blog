const crypto = require('crypto');
const fs = require('fs');
const md = require('markdown-it')();

const package = require('./package.json');

const { Deta } = require('deta');
const express = require('express')

const deta = Deta(process.env.DETATOKEN || "");
const articles = deta.Base('articles');
const app = express();

app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use((req, res, next) => {
	res.error = (code, msg) => {
		res.json({
			error: true,
			msg: msg
		});
		res.status(code).end();
	};

	res.success = (data, msg='') => {
		res.json({
			error: false,
			data: data,
			msg: msg
		});
		res.status(200).end();
	};

	next();
});

app.get('/', (req, res) => res.send(`GodotID Blog API ${package.version}`));

app.post('/submit', async (req, res) => {
	let article = new Article(req.body.title, req.body.content, 'hanz')
	await articles.put(article);
	res.location(`https://blog.godot.id/${article.key}`);
	res.status(302).end();
});

app.get('/article/:article', async (req, res) => {
	let article = await articles.get(req.params.article);
	if (!article) {
		return res.error(404, 'Article did not exists');
	}
	let { content, title } = article;

	content = md.render(`# ${title}\n${content}`);
	return res.success({
		...article,
		rendered: content
	});
});

function normalizeTitle(title) {
	return title.replace(/\s/g, '-').replace(/[^a-z0-9\-]/ig, '').toLowerCase();
}

class Article {
	constructor(title, content, author) {
		let hash = crypto.createHash('sha256')
			   .update(title + content + author)
			   .digest('hex').substring(0, 8);
		this.key = `${normalizeTitle(title)}-${hash}`;
		this.title = title;
		this.content = content;
		this.author = author;
	}
}

if (process.env.USER == "hanz") {
	app.listen(8080, async () => {
		console.log("Ran at 8080");
	});
} else {
	module.exports = app;
}

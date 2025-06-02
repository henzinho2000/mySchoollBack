const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 3000;

require("dotenv").config()

app.use(bodyParser.json());
app.use(cors());

// Configuração do banco de dados
const pool = new Pool({
	connectionString: process.env.BDD,
	ssl: {
		rejectUnauthorized: false
	}
});

// Teste de conexão (opcional)
pool.connect((err, client, release) => {
	if (err) {
		console.error('Erro ao conectar ao banco:', err.stack);
	} else {
		console.log('Conectado ao banco de dados PostgreSQL!');
		release();
	}
});

// Rotas GET
app.get("/projects", async (req, res) => {
	try {
		const result = await pool.query(
			"SELECT id, title, date, description, tags FROM projects"
		);
		console.log(result.rows);
		res.json(result.rows);
	} catch (err) {
		console.error('Erro ao buscar projetos:', err);
		res.status(500).json({ error: 'Erro interno do servidor' });
	}
});

app.get("/projects/class/:Class", async (req, res) => {
	try {
		const { Class } = req.params;
		// Assumindo que tags é um array JSON ou texto
		const result = await pool.query(`
			SELECT id, title, date, description, tags FROM projects
			WHERE $1 = ANY(tags);  
		`, [Class]);
		res.json(result.rows);
	} catch (err) {
		console.error('Erro ao buscar projetos por classe:', err);
		res.status(500).json({ error: 'Erro interno do servidor' });
	}
});

app.get("/projects/id/:idProject", async (req, res) => {
	try {
		const { idProject } = req.params;
		const result = await pool.query("SELECT * FROM projects WHERE id = $1", [
			idProject,
		]);
		
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Projeto não encontrado' });
		}
		
		res.json(result.rows[0]);
	} catch (err) {
		console.error('Erro ao buscar projeto por ID:', err);
		res.status(500).json({ error: 'Erro interno do servidor' });
	}
});

app.get("/comments/:idProject", async (req, res) => {
	try {
		const { idProject } = req.params;
		const result = await pool.query(
			"SELECT * FROM comments WHERE project_id = $1",
			[idProject]
		);
		res.json(result.rows);
	} catch (err) {
		console.error('Erro ao buscar comentários:', err);
		res.status(500).json({ error: 'Erro interno do servidor' });
	}
});

// Rotas POST
app.post("/projects", async (req, res) => {
	try {
		const {
			date,
			title,
			links,
			subjects,
			images,
			documents,
			description,
			tags,
		} = req.body;
		
		const result = await pool.query(
			"INSERT INTO projects (date, title, links, subjects, images, documents, description, tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
			[date, title, links, subjects, images, documents, description, tags]
		);
		res.status(201).json(result.rows[0]);
	} catch (err) {
		console.error('Erro ao criar projeto:', err);
		res.status(500).json({ error: 'Erro interno do servidor' });
	}
});

app.post("/comments", async (req, res) => {
	try {
		const { project_id, text, name } = req.body;
		const result = await pool.query(
			"INSERT INTO comments (project_id, text, name) VALUES ($1, $2, $3) RETURNING *",
			[project_id, text, name]
		);
		res.status(201).json(result.rows[0]);
	} catch (err) {
		console.error('Erro ao criar comentário:', err);
		res.status(500).json({ error: 'Erro interno do servidor' });
	}
});

// Rotas DELETE
app.delete("/projects/:idProject", async (req, res) => {
	try {
		const { idProject } = req.params;
		
		// Usar transação para garantir consistência
		await pool.query('BEGIN');
		await pool.query("DELETE FROM comments WHERE project_id = $1", [idProject]);
		const result = await pool.query("DELETE FROM projects WHERE id = $1", [idProject]);
		await pool.query('COMMIT');
		
		if (result.rowCount === 0) {
			return res.status(404).json({ error: 'Projeto não encontrado' });
		}
		
		res.json({ message: "Projeto deletado" });
	} catch (err) {
		await pool.query('ROLLBACK');
		console.error('Erro ao deletar projeto:', err);
		res.status(500).json({ error: 'Erro interno do servidor' });
	}
});

app.delete("/comments/:idComment", async (req, res) => {
	try {
		const { idComment } = req.params;
		const result = await pool.query("DELETE FROM comments WHERE id = $1", [idComment]);
		
		if (result.rowCount === 0) {
			return res.status(404).json({ error: 'Comentário não encontrado' });
		}
		
		res.json({ message: "Comentário deletado" });
	} catch (err) {
		console.error('Erro ao deletar comentário:', err);
		res.status(500).json({ error: 'Erro interno do servidor' });
	}
});

app.listen(port, () => {
	console.log(`Servidor rodando em http://localhost:${port}`);
});
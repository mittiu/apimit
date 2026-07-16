require("dotenv").config();
console.log("HOST:", process.env.DB_HOST);
console.log("PORT:", process.env.DB_PORT);
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req,res)=>res.json({online:true,name:"Midnight API"}));

app.get("/streamers", async (req,res)=>{
 const [rows] = await db.query("SELECT * FROM streamers ORDER BY nome");
 res.json(rows);
});

app.post("/abc123", (req, res) => {
    res.json({
        ok: true
    });
});
app.delete('/streamer/:id', async (req, res) => {
    try {

        await db.query(
            'DELETE FROM streamers WHERE id = ?',
            [req.params.id]
        );

        res.json({
            success: true
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }
});

app.get('/delete/:id', async (req, res) => {

    await db.query(
        'DELETE FROM streamers WHERE id = ?',
        [req.params.id]
    );

    res.json({
        success: true
    });

});
app.get("/rename-kick-column", async (req, res) => {
    try {
        await db.query(`
            ALTER TABLE streamers
            RENAME COLUMN kickId TO kick_id
        `);

        res.json({
            success: true,
            message: "Coluna renomeada para kick_id!"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
app.get('/users', async (req, res) => {
    try {

        const [rows] = await db.query(`
            SELECT *
            FROM users
        `);

        res.json(rows);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }
});
app.get("/test/addstreamer", async (req, res) => {
    try {

        const id = Number(req.query.id) || Math.floor(1000 + Math.random() * 9000);
        const nome = req.query.nome || ("Streamer_" + id);
        const twitch = req.query.twitch || nome.toLowerCase();

        const [exists] = await db.query(
            "SELECT id FROM streamers WHERE id = ?",
            [id]
        );

        if (exists.length === 0) {

            await db.query(
                `INSERT INTO streamers
                (id, nome, twitch_id, status)
                VALUES (?, ?, ?, 'offline')`,
                [id, nome, twitch]
            );

        }

        let total = 0;

        for (let i = 0; i < 18; i++) {

            const entrada = new Date();

            // Últimos 30 dias
            entrada.setDate(entrada.getDate() - Math.floor(Math.random() * 30));

            // Começa entre 17h e 22h
            entrada.setHours(
                17 + Math.floor(Math.random() * 6),
                Math.floor(Math.random() * 60),
                0,
                0
            );

            // Live entre 4 e 8 horas
            const saida = new Date(entrada);
            saida.setHours(
                saida.getHours() + (4 + Math.floor(Math.random() * 5))
            );

            saida.setMinutes(
                saida.getMinutes() + Math.floor(Math.random() * 60)
            );

            await db.query(
                `INSERT INTO streamer_sessions
                (streamer_id, entrada, saida)
                VALUES (?, ?, ?)`,
                [id, entrada, saida]
            );

            total++;
        }

        res.json({
            success: true,
            streamer: {
                id,
                nome,
                twitch
            },
            sessions: total
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }
});


app.get('/test/addstreamer', async (req,res)=>{

    const nome = "Teste_" + Date.now();

    await db.query(`
        INSERT INTO streamers
        (nome, twitch_id, status)
        VALUES
        (?, ?, ?)
    `,[nome,nome,"online"]);

    res.json({
        success:true,
        nome
    });

});
app.post("/openlive", async (req, res) => {
    try {
        const { id, nome, twitch, kick } = req.body;  // ← Adicionar kick

        const [streamer] = await db.query(
            "SELECT * FROM streamers WHERE id = ?",
            [id]
        );

        // Se não existir, cria o streamer
        if (streamer.length === 0) {

            await db.query(
                `INSERT INTO streamers
                (id, nome, twitch_id, kick_id, status)
                VALUES (?, ?, ?, ?, 'online')`,  // ← Adicionar kick_id
                [id, nome, twitch, kick]  // ← Adicionar kick
            );

        } else {

            // Se existir, apenas coloca online
            await db.query(
                "UPDATE streamers SET status = 'online' WHERE id = ?",
                [id]
            );

        }

        // Verifica se já existe uma sessão aberta
        const [sessao] = await db.query(
            `SELECT id
             FROM streamer_sessions
             WHERE streamer_id = ?
             AND saida IS NULL
             LIMIT 1`,
            [id]
        );

        // Só cria uma nova sessão se não existir uma aberta
        if (sessao.length === 0) {

            await db.query(
                `INSERT INTO streamer_sessions
                (streamer_id, entrada)
                VALUES (?, NOW())`,
                [id]
            );

        }

        res.json({
            success: true,
            message: "Live iniciada."
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.message
        });

    }
});

app.post("/offlive", async (req, res) => {
    try {
        const { id } = req.body;

        const [streamer] = await db.query(
            "SELECT * FROM streamers WHERE id = ?",
            [id]
        );

        if (streamer.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Streamer não encontrado."
            });
        }

        await db.query(
            "UPDATE streamers SET status = 'offline' WHERE id = ?",
            [id]
        );

        await db.query(
            `UPDATE streamer_sessions
             SET saida = NOW()
             WHERE streamer_id = ?
             AND saida IS NULL
             ORDER BY id DESC
             LIMIT 1`,
            [id]
        );

        res.json({
            success: true,
            message: "Live finalizada."
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.get("/schema", async (req, res) => {

    const [tables] = await db.query("SHOW TABLES");

    const resultado = {};

    for (const table of tables) {

        const nome = Object.values(table)[0];

        const [cols] = await db.query(`SHOW COLUMNS FROM \`${nome}\``);

        resultado[nome] = cols;
    }

    res.json(resultado);

});

app.listen(process.env.PORT || 3000, ()=>{
 console.log("API ONLINE");
});

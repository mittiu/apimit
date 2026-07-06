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
app.get("/test/populate", async (req, res) => {
    try {

        const streamers = [
            { id: 101, nome: "Mittiu", twitch: "mittiu" },
            { id: 102, nome: "Capitao", twitch: "capitao" },
            { id: 103, nome: "Oudry", twitch: "oudry" },
            { id: 104, nome: "Titia", twitch: "titia" },
            { id: 105, nome: "Lopes", twitch: "lopes" },
            { id: 106, nome: "Arthur", twitch: "arthur" },
            { id: 107, nome: "Bruno", twitch: "bruno" },
            { id: 108, nome: "Pedro", twitch: "pedro" },
            { id: 109, nome: "Joao", twitch: "joao" },
            { id: 110, nome: "Lucas", twitch: "lucas" }
        ];

        let totalSessions = 0;

        for (const s of streamers) {

            const [exists] = await db.query(
                "SELECT id FROM streamers WHERE id = ?",
                [s.id]
            );

            if (exists.length === 0) {
                await db.query(`
                    INSERT INTO streamers
                    (id,nome,twitch_id,status)
                    VALUES (?,?,?,'offline')
                `, [s.id, s.nome, s.twitch]);
            }

            const [already] = await db.query(
                "SELECT COUNT(*) total FROM sessions WHERE streamer_id = ?",
                [s.id]
            );

            if (already[0].total > 0)
                continue;

            for (let i = 0; i < 40; i++) {

                const daysAgo = Math.floor(Math.random() * 180);

                const entrada = new Date();

                entrada.setDate(entrada.getDate() - daysAgo);

                entrada.setHours(
                    17 + Math.floor(Math.random() * 6),
                    Math.floor(Math.random() * 60),
                    0,
                    0
                );

                const horas = 4 + Math.floor(Math.random() * 5);

                const saida = new Date(entrada);
                saida.setHours(saida.getHours() + horas);
                saida.setMinutes(saida.getMinutes() + Math.floor(Math.random() * 50));

                await db.query(`
                    INSERT INTO sessions
                    (streamer_id,entrada,saida)
                    VALUES (?,?,?)
                `, [s.id, entrada, saida]);

                totalSessions++;
            }

        }

        res.json({
            success: true,
            streamers: streamers.length,
            sessions: totalSessions
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
        const { id, nome, twitch } = req.body;

        const [streamer] = await db.query(
            "SELECT * FROM streamers WHERE id = ?",
            [id]
        );

        // Se não existir, cria o streamer
        if (streamer.length === 0) {

            await db.query(
                `INSERT INTO streamers
                (id, nome, twitch_id, status)
                VALUES (?, ?, ?, 'online')`,
                [id, nome, twitch]
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
app.get('/schema', async (req, res) => {
    try {

        const [tables] = await db.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ?
        `, [process.env.DB_NAME]);

        const schema = {};

        for (const table of tables) {

            const [columns] = await db.query(`
                SHOW COLUMNS FROM \`${table.TABLE_NAME}\`
            `);

            schema[table.TABLE_NAME] = columns;
        }

        res.json(schema);

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

app.listen(process.env.PORT || 3000, ()=>{
 console.log("API ONLINE");
});

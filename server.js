const express = require('express');
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// ==========================
// 🔹 CONFIG NETSUITE
// ==========================
const NETSUITE_URL = 'https://6932886.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=2582&deploy=1';

const oauth = OAuth({
    consumer: {
        key: '1c17e6883aaee9076cba8a14f018ec876538f4c9043a42d27077691a0b7b7b11',
        secret: '632b6b0f744eecd29be7510ec509990e72ba482ef4aabeada2bcad5924266447',
    },
    signature_method: 'HMAC-SHA256',
    hash_function(base_string, key) {
        return crypto
            .createHmac('sha256', key)
            .update(base_string)
            .digest('base64');
    },
});

const token = {
    key: '71323f421135af0d67f83719c5a1f090b22f3803f9ef43522aa1ee999dc2e259',
    secret: '8e9cc63d5334c635af23642aa95c353f98c0ae14084098df92bfdc0c40e9ae40',
};

// 🔥 HEADER CORRETO
function getHeaders(url, method) {
    const request_data = {
        url,
        method,
    };

    const oauthData = oauth.authorize(request_data, token);

    return {
        ...oauth.toHeader(oauthData),
        Authorization: oauth.toHeader(oauthData).Authorization
            .replace('OAuth ', 'OAuth realm="6932886", '),
        'Content-Type': 'application/json'
    };
}

// ==========================
// 🔹 SERVICE NETSUITE
// ==========================
async function buscarDadosNetSuite() {

    console.log('🟡 Chamando NetSuite...');

    const body = {
        consulta: "api_custo_desembarcado",
        filtros: {
            memorando: "ALT 2025-159 BP 2%",
            id: 0
        },
        limit: 500
    };

    const headers = getHeaders(NETSUITE_URL, 'POST');

    try {
        const start = Date.now();

        const response = await axios.post(
            NETSUITE_URL,
            body,
            { headers }
        );

        console.log('⏱️ Tempo:', Date.now() - start, 'ms');
        console.log('🟢 SUCESSO:', JSON.stringify(response.data, null, 2));

        return response.data;

    } catch (error) {

        console.log('🔴 ERRO NetSuite');

        if (error.response) {
            console.log('🔴 STATUS:', error.response.status);
            console.log('🔴 DATA:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('🔴 ERRO:', error.message);
        }

        return { data: [] }; // 🔥 evita quebrar
    }
}

// ==========================
// 🔹 ENDPOINT ALEXA
// ==========================
app.post('/alexa', async (req, res) => {
    try {

        console.log('📥 Alexa request:', JSON.stringify(req.body, null, 2));

        const requestType = req.body?.request?.type;


        // 🔥 TRATAR SESSION END
        if (requestType === 'SessionEndedRequest') {
            console.log('🔚 Sessão encerrada');
            return res.status(200).send(); // ⚠️ SEM JSON
        }

        let speechText = "Não entendi sua solicitação";

        if (requestType === 'LaunchRequest') {
            speechText = "Bem vindo ao Ruraldinho. Como posso ajudar?";
        }

        if (requestType === 'IntentRequest') {
            const intentName = req.body?.request?.intent?.name;

            if (intentName === 'FaturamentoHojeIntent') {

                const dados = await buscarDadosNetSuite();

                const lista = Array.isArray(dados?.data) ? dados.data : [];

                if (lista.length > 0) {
                    const fatura = lista[0]?.fatura || 'desconhecida';
                    speechText = `Encontrei a fatura ${fatura}`;
                } else {
                    speechText = "Não encontrei dados no NetSuite";
                }
            }
        }

        return res.json({
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: speechText
                },
                shouldEndSession: false
            }
        });

    } catch (error) {

        console.error('💥 ERRO CRÍTICO:', error);

        return res.json({
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Erro interno"
                },
                shouldEndSession: true
            }
        });
    }
});

// ==========================
// 🔹 TESTE LOCAL
// ==========================
app.get('/teste-netsuite', async (req, res) => {

    console.log('🧪 Teste manual iniciado');

    const dados = await buscarDadosNetSuite();

    res.json({
        sucesso: true,
        dados
    });
});

// ==========================
// 🔹 START SERVER
// ==========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
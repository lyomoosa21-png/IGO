// ==========================================================================
// 1. CONFIGURAÇÃO DE CREDENCIAIS DA CORPORAÇÃO IGO
// ==========================================================================
const SUPABASE_URL = "https://supabase.co";
const SUPABASE_KEY = "sb_publishable_hqvTciVakpBrF9qUPCdq1g_9Z0sF2cQ";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Estados Globais de Execução em Memória
let usuarioLogado = null;
let batalhaAtivaId = null;
let abaAtualAtiva = 'arena';
let tipoAuthAtual = 'login'; // 'login' ou 'cadastro'

// ==========================================================================
// 2. INICIALIZADOR GLOBAL DO SISTEMA (SPA)
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Escutar mudanças de estado de autenticação em tempo real
    _supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            usuarioLogado = session.user;
            sincronizarInterfaceUsuario(true);
        } else {
            usuarioLogado = null;
            sincronizarInterfaceUsuario(false);
        }
    });

    // 2. Carregar dados cruciais da base de dados
    await carregarArenaPrincipal();
    await carregarComentariosArena();
    await carregarFeedSondagens();
});

// Sistema Avançado de Navegação Sem Recarregamento (SPA)
function alternarAba(nomeAba, elementoBotao = null) {
    abaAtualAtiva = nomeAba;
    
    // Ocultar todas as páginas do aplicativo
    document.querySelectorAll('.app-page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Ativar a página solicitada
    const paginaAlvo = document.getElementById(`aba-${nomeAba}`);
    if (paginaAlvo) paginaAlvo.classList.add('active');
    
    // Sincronizar classes visuais na barra de navegação inferior
    if (elementoBotao) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        elementoBotao.classList.add('active');
    } else {
        // Fallback caso a navegação ocorra de forma indireta
        document.querySelectorAll('.nav-item').forEach(item => {
            const texto = item.querySelector('.nav-text').innerText.toLowerCase();
            if (texto === nomeAba) item.classList.add('active');
            else item.classList.remove('active');
        });
    }

    // Se a aba for o perfil, injetar dados atualizados do banco
    if (nomeAba === 'perfil' && usuarioLogado) {
        renderizarDadosPerfilServidor();
    }
}

// Modais Popups de Fluxo (Controle de Janelas)
function abrirModalAutenticacao(tipo) {
    tipoAuthAtual = tipo;
    const overlay = document.getElementById('modal-auth');
    const titulo = document.getElementById('auth-modal-title');
    const campoUsername = document.getElementById('group-username');
    const campoTermos = document.getElementById('group-terms');
    
    overlay.classList.remove('hidden');
    
    if (tipo === 'login') {
        titulo.innerText = "Entrar na IGO";
        campoUsername.classList.add('hidden');
        campoTermos.classList.add('hidden');
    } else {
        titulo.innerText = "Criar Conta Global";
        campoUsername.classList.remove('hidden');
        campoTermos.classList.remove('hidden');
    }
}

function abrirModalCriarSondagem() {
    if (!usuarioLogado) {
        alert("🚨 Acesso Negado: Precisa de iniciar sessão para criar uma sondagem!");
        alternarAba('perfil');
        return;
    }
    document.getElementById('modal-criar-sondagem').classList.remove('hidden');
}

function fecharModais() {
    document.getElementById('modal-auth').classList.add('hidden');
    document.getElementById('modal-criar-sondagem').classList.add('hidden');
}

// ==========================================================================
// 3. SISTEMA DE AUTENTICAÇÃO BLINDADO (REGRAS CORPORATIVAS)
// ==========================================================================
async function processarAutenticacao(event) {
    event.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    
    if (tipoAuthAtual === 'cadastro') {
        const username = document.getElementById('auth-username').value.trim().toLowerCase();
        const aceitouTermos = document.getElementById('auth-terms').checked;
        
        // Validações Estratégicas Iniciais
        if (!username || username.length < 3) {
            alert("⚠️ O nome de utilizador deve ter no mínimo 3 caracteres.");
            return;
        }
        if (!aceitouTermos) {
            alert("⚠️ É obrigatório declarar ter mais de 13 anos para prosseguir.");
            return;
        }

        try {
            // Executar criação de credenciais nativas no Supabase Auth
            const { user, error } = await _supabase.auth.signUp({ email, password });
            if (error) throw error;
            
            if (user) {
                // Inserir registro complementar na tabela pública de perfis
                const { error: erroPerfil } = await _supabase
                    .from('profiles')
                    .insert([{ id: user.id, username: username, bio: "Pronto para decidir os reis da fama." }]);
                
                if (erroPerfil) throw erroPerfil;
                alert("🎯 Conta criada! Verifique o seu e-mail se necessário ou faça login.");
                fecharModais();
            }
        } catch (err) {
            alert("Erro no cadastro: " + err.message);
        }
    } else {
        // Fluxo de Início de Sessão Pura (Login)
        try {
            const { session, error } = await _supabase.auth.signIn({ email, password });
            if (error) throw error;
            
            alert("🔓 Sessão iniciada com sucesso na IGO!");
            fecharModais();
            // Processar e atualizar dias seguidos (Streaks de Retenção)
            await atualizarContadorDiasSeguidos(session.user.id);
        } catch (err) {
            alert("Erro no login: " + err.message);
        }
    }
}

// ==========================================================================
// 4. MOTOR COMPUTACIONAL DA ARENA (VOTOS, REAÇÕES E PORCENTAGENS)
// ==========================================================================
async function carregarArenaPrincipal() {
    try {
        // Busca o duelo que está com status 'active' na base de dados
        const { data: battles, error } = await _supabase
            .from('battles')
            .select('*')
            .eq('status', 'active')
            .limit(1);

        if (error) throw error;

        if (battles && battles.length > 0) {
            const b = battles[0];
            batalhaAtivaId = b.id;

            // Injetar dados nas tags respeitando a simetria indestrutível do CSS
            document.getElementById('batalha-titulo').innerText = b.title;
            document.getElementById('nome-c1').innerText = b.competitor_1_name;
            document.getElementById('nome-c2').innerText = b.competitor_2_name;

            if (b.competitor_1_image) document.getElementById('img-c1').src = b.competitor_1_image;
            if (b.competitor_2_image) document.getElementById('img-c2').src = b.competitor_2_image;

            // Se o utilizador já estiver logado, verificar se ele já votou nesta batalha
            if (usuarioLogado) {
                const { data: votoExistente } = await _supabase
                    .from('votes')
                    .select('id')
                    .eq('user_id', usuarioLogado.id)
                    .eq('battle_id', batalhaAtivaId);

                if (votoExistente && votoExistente.length > 0) {
                    // Se já votou, quebra o bloqueio de curiosidade (remove o blur)
                    revelarPorcentagensArena();
                }
            }
            await computarPorcentagensArena();
        } else {
            document.getElementById('batalha-titulo').innerText = "Nenhum duelo ativo de momento.";
        }
    } catch (err) {
        console.error("Erro na Arena:", err.message);
    }
}

async function computarPorcentagensArena() {
    if (!batalhaAtivaId) return;
    try {
        const { data: votos, error } = await _supabase
            .from('votes')
            .select('choice')
            .eq('battle_id', batalhaAtivaId);

        if (error) throw error;

        const total = votos.length;
        const c1 = votos.filter(v => v.choice === '1').length;
        const c2 = votos.filter(v => v.choice === '2').length;

        // Proteção contra divisão por zero
        const p1 = total > 0 ? Math.round((c1 / total) * 100) : 0;
        const p2 = total > 0 ? Math.round((c2 / total) * 100) : 0;

        document.getElementById('percent-1').innerText = `${p1}%`;
        document.getElementById('percent-2').innerText = `${p2}%`;
        document.getElementById('total-votos-texto').innerText = `🎯 ${total.toLocaleString()} utilizadores globais já decidiram hoje.`;
    } catch (err) {
        console.error(err.message);
    }
}

async function processarVoto(escolha) {
    // Gatilho de Bloqueio Rígido: Impede votos anónimos
    if (!usuarioLogado) {
        alert("🚨 Decisão bloqueada! Para influenciar este duelo e ver os resultados parciais, precisa de criar uma conta gratuita.");
        alternarAba('perfil');
        return;
    }

    try {
        // Gravação direta e blindada com a regra UNIQUE do Supabase
        const { error } = await _supabase
            .from('votes')
            .insert([{ user_id: usuarioLogado.id, battle_id: batalhaAtivaId, choice: escolha }]);

        if (error) {
            if (error.message.includes('unique_user_battle')) {
                alert("⚠️ A sua decisão para este duelo já foi registada na base de dados. Cada utilizador tem direito a 1 voto.");
            } else {
                throw error;
            }
            return;
        }

        alert("🎯 Voto processado com sucesso! Obrigado por decidir.");
        revelarPorcentagensArena();
        await computarPorcentagensArena();
    } catch (err) {
        alert("Erro no processamento do voto: " + err.message);
    }
}

function revelarPorcentagensArena() {
    document.getElementById('box-res-1').classList.remove('blur-effect');
    document.getElementById('box-res-2').classList.remove('blur-effect');
}

// ==========================================================================
// 5. SISTEMA DE COMENTÁRIOS E FILTRO DE DENÚNCIAS DE CUSTO ZERO
// ==========================================================================
async function carregarComentariosArena() {
    if (!batalhaAtivaId) return;
    try {
        const { data: comments, error } = await _supabase
            .from('comments')
            .select('id, comment_text, user_id, profiles(username)')
            .eq('battle_id', batalhaAtivaId)
            .eq('is_hidden', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const container = document.getElementById('lista-comentarios-arena');
        container.innerHTML = "";

        comments.forEach(c => {
            const autor = c.profiles ? `@${c.profiles.username}` : '@anon';
            const card = document.createElement('div');
            card.className = 'comment-card';
            card.innerHTML = `
                <div class="comment-meta">
                    <span>${autor}</span>
                    <span class="comment-report-btn" onclick="denunciarComentario('${c.id}')">⚠️ Denunciar</span>
                </div>
                <p>${c.comment_text}</p>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err.message);
    }
}

async function enviarComentarioArena() {
    if (!usuarioLogado) {
        alert("🚨 Inicie sessão para comentar.");
        alternarAba('perfil');
        return;
    }

    const input = document.getElementById('input-comentario-arena');
    const texto = input.value.trim();

    if (!texto) return;

    // Filtro Local Automático de Palavras Ofensivas (Bad Words List Básica)
    const palavrasProibidas = ["insulto1", "palavrao2", "ofensa3"]; // Adicione os termos indesejados aqui
    let textoFiltrado = texto;
    palavrasProibidas.forEach(palavra => {
        const regex = new RegExp(palavra, "gi");
        textoFiltrado = textoFiltrado.replace(regex, "***");
    });

    try {
        const { error } = await _supabase
            .from('comments')
            .insert([{ user_id: usuarioLogado.id, battle_id: batalhaAtivaId, comment_text: textoFiltrado }]);

        if (error) throw error;
        input.value = "";
        await carregarComentariosArena();
    } catch (err) {
        alert(err.message);
    }
}

async function denunciarComentario(idComentario) {
    if (!confirm("Deseja mesmo denunciar este comentário por comportamento inadequado?")) return;
    try {
        // Puxa o contador atual de denúncias do comentário
        const { data } = await _supabase.from('comments').select('report_count').eq('id', idComentario).single();
        const novaContagem = (data ? data.report_count : 0) + 1;

        // Se passar de 3 denúncias, o status 'is_hidden' vira TRUE e o post some de imediato
        const ocultar = novaContagem >= 3;

        await _supabase
            .from('comments')
            .update({ report_count: novaContagem, is_hidden: ocultar })
            .eq('id', idComentario);

        alert("🛡️ Denúncia registada! Obrigado por ajudar a manter a IGO limpa.");
        await carregarComentariosArena();
    } catch (err) {
        console.error(err.message);
    }
}

// ==========================================================================
// 6. ABA FEED (SONDAGENS EM TEXTO LEVE DO COMPILADOR DO FEED)
// ==========================================================================
async function carregarFeedSondagens() {
    try {
        const { data: polls, error } = await _supabase
            .from('user_polls')
            .select('*, profiles(username)')
            .eq('is_hidden', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const container = document.getElementById('container-feed-sondagens');
        container.innerHTML = "";

        if (polls.length === 0) {
            container.innerHTML = "<p class='engagement-bar'>Nenhuma sondagem criada pela comunidade ainda.</p>";
            return;
        }

        polls.forEach(p => {
            const autor = p.profiles ? `@${p.profiles.username}` : '@anon';
            const card = document.createElement('div');
            card.className = 'poll-card';
            card.innerHTML = `
                <div class="poll-user">${autor} • ${p.category}</div>
                <h3>${p.question}</h3>
                <button class="poll-option-btn" onclick="votarNaSondagem('${p.id}', 1)">A: ${p.option_1}</button>
                <button class="poll-option-btn" onclick="votarNaSondagem('${p.id}', 2)">B: ${p.option_2}</button>
                ${p.option_3 ? `<button class="poll-option-btn" onclick="votarNaSondagem('${p.id}', 3)">C: ${p.option_3}</button>` : ''}
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err.message);
    }
}


// ==========================================================================
// 6. ABA FEED (SONDAGENS EM TEXTO LEVE DO COMPILADOR DO FEED)
// ==========================================================================
async function carregarFeedSondagens() {
    try {
        const { data: polls, error } = await _supabase
            .from('user_polls')
            .select('*, profiles(username)')
            .eq('is_hidden', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const container = document.getElementById('container-feed-sondagens');
        container.innerHTML = "";

        if (polls.length === 0) {
            container.innerHTML = "<p class='engagement-bar'>Nenhuma sondagem criada pela comunidade ainda.</p>";
            return;
        }

        polls.forEach(p => {
            const autor = p.profiles ? `@${p.profiles.username}` : '@anon';
            const card = document.createElement('div');
            card.className = 'poll-card';
            card.innerHTML = `
                <div class="poll-user">${autor} • ${p.category}</div>
                <h3>${p.question}</h3>
                <button class="poll-option-btn" onclick="votarNaSondagem('${p.id}', 1)">A: ${p.option_1}</button>
                <button class="poll-option-btn" onclick="votarNaSondagem('${p.id}', 2)">B: ${p.option_2}</button>
                ${p.option_3 ? `<button class="poll-option-btn" onclick="votarNaSondagem('${p.id}', 3)">C: ${p.option_3}</button>` : ''}
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err.message);
    }
}

async function executarCriacaoSondagem() {
    const q = document.getElementById('poll-question').value.trim();
    const o1 = document.getElementById('poll-opt1').value.trim();
    const o2 = document.getElementById('poll-opt2').value.trim();
    const o3 = document.getElementById('poll-opt3').value.trim();
    const cat = document.getElementById('poll-category').value;

    if (!q || !o1 || !o2) {
        alert("⚠️ Por favor, preencha a pergunta e no mínimo as duas primeiras opções.");
        return;
    }

    try {
        const { error } = await _supabase
            .from('user_polls')
            .insert([{ user_id: usuarioLogado.id, question: q, category: cat, option_1: o1, option_2: o2, option_3: o3 || null }]);

        if (error) throw error;
        alert("📱 Sondagem lançada com sucesso no Feed!");
        fecharModais();
        await carregarFeedSondagens();
    } catch (err) {
        alert(err.message);
    }
}

async function votarNaSondagem(pollId, escolhaOpcao) {
    if (!usuarioLogado) {
        alert("🚨 Inicie sessão para participar nas votações do Feed.");
        alternarAba('perfil');
        return;
    }
    try {
        const { error } = await _supabase
            .from('poll_votes')
            .insert([{ user_id: usuarioLogado.id, poll_id: pollId, choice: escolhaOpcao }]);

        if (error) {
            alert("⚠️ Já registou o seu voto nesta sondagem da comunidade.");
            return;
        }
        alert("🎯 Voto computado no Feed!");
    } catch (err) {
        console.error(err.message);
    }
}

// ==========================================================================
// 7. UTILS DE RETENÇÃO (STREAKS DIÁRIOS) E DESCONEXÃO
// ==========================================================================
async function atualizarContadorDiasSeguidos(userId) {
    try {
        const { data, error } = await _supabase.from('profiles').select('streak_days, last_active_date').eq('id', userId).single();
        if (error) return;

        const hoje = new Date().toISOString().split('T')[0];
        const ultimaData = data.last_active_date;

        if (ultimaData !== hoje) {
            const ontem = new Date();
            ontem.setDate(ontem.getDate() - 1);
            const ontemString = ontem.toISOString().split('T')[0];

            let novoStreak = 1;
            if (ultimaData === ontemString) {
                novoStreak = data.streak_days + 1; // Incrementa se a sequência foi mantida
            }

            await _supabase
                .from('profiles')
                .update({ streak_days: novoStreak, last_active_date: hoje })
                .eq('id', userId);
        }
    } catch (err) {
        console.error(err.message);
    }
}

function sincronizarInterfaceUsuario(estaLogado) {
    const deslogadoDiv = document.getElementById('perfil-desconectado');
    const logadoDiv = document.getElementById('perfil-conectado');
    
    if (estaLogado) {
        if (deslogadoDiv) deslogadoDiv.classList.add('hidden');
        if (logadoDiv) logadoDiv.classList.remove('hidden');
    } else {
        if (deslogadoDiv) deslogadoDiv.classList.remove('hidden');
        if (logadoDiv) logadoDiv.classList.add('hidden');
    }
}

async function renderizarDadosPerfilServidor() {
    try {
        const { data, error } = await _supabase.from('profiles').select('username, streak_days, bio').eq('id', usuarioLogado.id).single();
        if (error) throw error;

        document.getElementById('perfil-username').innerText = `@${data.username}`;
        document.getElementById('perfil-streak').innerText = data.streak_days;
        document.getElementById('perfil-bio').innerText = data.bio || "Membro da Elite IGO.";
    } catch (err) {
        console.error(err.message);
    }
}

async function executarLogout() {
    if (confirm("Deseja mesmo sair da sua conta na IGO?")) {
        await _supabase.auth.signOut();
        alert("🔒 Sessão encerrada de forma segura.");
        alternarAba('arena');
    }
}

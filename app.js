// Variáveis globais
let agendamentos = [];
let calendar = null;
let editMode = false;
let currentEditId = null;

// Função principal quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', async function () {
    // Inicialização do calendário
    await inicializarCalendario();
    
    // Configuração do formulário
    configurarFormulario();
    
    // Configuração dos eventos de interface
    configurarEventosUI();
    
    // Carrega os dados iniciais
    await atualizarInterface();
});

// Inicializa o calendário FullCalendar
async function inicializarCalendario() {
    calendar = new FullCalendar.Calendar(document.getElementById('calendario'), {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: await carregarAgendamentosParaCalendario(),
        eventClick: function(info) {
            editarAgendamento(parseInt(info.event.id));
        }
    });
    calendar.render();
}

// Configura o formulário de agendamento
function configurarFormulario() {
    const form = document.getElementById('form-agendamento');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validarFormulario()) {
            mostrarAlerta('Atenção!', 'Por favor, preencha todos os campos obrigatórios', 'warning');
            return;
        }
        
        const agendamento = {
            id: editMode ? currentEditId : Date.now(),
            nome: document.getElementById('nomeCliente').value,
            tipo: document.getElementById('tipoServico').value,
            data: document.getElementById('data').value,
            hora: document.getElementById('horario').value,
            valor: document.getElementById('valor').value,
            observacoes: document.getElementById('observacoes').value
        };

        if (editMode) {
            await atualizarAgendamento(agendamento);
        } else {
            await salvarAgendamento(agendamento);
        }
        
        await atualizarInterface();
        form.reset();
        sairModoEdicao();
        
        mostrarAlerta('Sucesso!', `Agendamento ${editMode ? 'atualizado' : 'salvo'} com sucesso`, 'success');
    });
}

// Configura eventos de UI
function configurarEventosUI() {
    // Botão de confirmação de exclusão
    document.getElementById('confirmDelete').addEventListener('click', async function() {
        const id = parseInt(this.dataset.idToDelete);
        if (id) {
            await excluirAgendamento(id);
            await atualizarInterface();
            bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
            mostrarAlerta('Sucesso!', 'Agendamento excluído com sucesso', 'success');
        }
    });

    // Botão cancelar edição
    document.getElementById('cancel-edit').addEventListener('click', sairModoEdicao);
}

// Funções de CRUD
async function carregarAgendamentos() {
    try {
        const dados = await localforage.getItem('agendamentos');
        return dados ? dados : [];
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        return [];
    }
}

async function carregarAgendamentosParaCalendario() {
    const agendamentos = await carregarAgendamentos();
    return agendamentos.map(a => ({
        id: a.id.toString(),
        title: `${a.nome} - ${a.tipo}`,
        start: `${a.data}T${a.hora}`,
        extendedProps: {
            observacoes: a.observacoes,
            valor: a.valor
        }
    }));
}

async function salvarAgendamento(novoAgendamento) {
    try {
        const agendamentos = await carregarAgendamentos();
        agendamentos.push(novoAgendamento);
        await localforage.setItem('agendamentos', agendamentos);
        return true;
    } catch (error) {
        console.error('Erro ao salvar agendamento:', error);
        return false;
    }
}

async function atualizarAgendamento(agendamentoAtualizado) {
    try {
        let agendamentos = await carregarAgendamentos();
        const index = agendamentos.findIndex(a => a.id === agendamentoAtualizado.id);
        
        if (index !== -1) {
            agendamentos[index] = agendamentoAtualizado;
            await localforage.setItem('agendamentos', agendamentos);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erro ao atualizar agendamento:', error);
        return false;
    }
}

async function excluirAgendamento(id) {
    try {
        let agendamentos = await carregarAgendamentos();
        agendamentos = agendamentos.filter(a => a.id !== id);
        await localforage.setItem('agendamentos', agendamentos);
        return true;
    } catch (error) {
        console.error('Erro ao excluir agendamento:', error);
        return false;
    }
}

// Atualiza a interface
async function atualizarInterface() {
    try {
        agendamentos = await carregarAgendamentos();
        
        // Atualiza calendário
        calendar.removeAllEvents();
        const eventosCalendario = await carregarAgendamentosParaCalendario();
        calendar.addEventSource(eventosCalendario);
        
        // Atualiza lista
        const listaEl = document.getElementById('agendamentos-lista');
        listaEl.innerHTML = agendamentos.map(a => criarItemLista(a)).join('');
    } catch (error) {
        console.error('Erro ao atualizar interface:', error);
    }
}

// Funções auxiliares
function criarItemLista(agendamento) {
    return `
        <li class="list-group-item" data-id="${agendamento.id}">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <strong>${agendamento.nome}</strong> - ${agendamento.tipo}<br>
                    <small>${formatarData(agendamento.data)} às ${agendamento.hora} | R$ ${agendamento.valor}</small>
                    ${agendamento.observacoes ? `<p class="mt-1"><em>${agendamento.observacoes}</em></p>` : ''}
                </div>
                <div>
                    <button class="btn btn-sm btn-warning me-1" onclick="editarAgendamento(${agendamento.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="prepararExclusao(${agendamento.id})">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </div>
        </li>
    `;
}

function formatarData(dataString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dataString).toLocaleDateString('pt-BR', options);
}

function validarFormulario() {
    const camposObrigatorios = [
        'nomeCliente',
        'tipoServico',
        'data',
        'horario',
        'valor'
    ];

    let valido = true;
    camposObrigatorios.forEach(id => {
        const campo = document.getElementById(id);
        if (!campo.value) {
            campo.classList.add('is-invalid');
            valido = false;
        } else {
            campo.classList.remove('is-invalid');
        }
    });

    return valido;
}

function mostrarAlerta(titulo, mensagem, tipo) {
    Swal.fire(titulo, mensagem, tipo);
}

// Funções de modo de edição
function entrarModoEdicao(agendamento) {
    editMode = true;
    currentEditId = agendamento.id;
    
    document.getElementById('nomeCliente').value = agendamento.nome;
    document.getElementById('tipoServico').value = agendamento.tipo;
    document.getElementById('data').value = agendamento.data;
    document.getElementById('horario').value = agendamento.hora;
    document.getElementById('valor').value = agendamento.valor;
    document.getElementById('observacoes').value = agendamento.observacoes || '';
    
    document.getElementById('form-title').textContent = 'Editar Agendamento';
    document.getElementById('cancel-edit').classList.remove('d-none');
    document.getElementById('form-agendamento').scrollIntoView({ behavior: 'smooth' });
}

function sairModoEdicao() {
    editMode = false;
    currentEditId = null;
    
    document.getElementById('form-agendamento').reset();
    document.getElementById('form-title').textContent = 'Novo Agendamento';
    document.getElementById('cancel-edit').classList.add('d-none');
}

// Funções globais
window.prepararExclusao = function(id) {
    const confirmBtn = document.getElementById('confirmDelete');
    confirmBtn.dataset.idToDelete = id;
    new bootstrap.Modal(document.getElementById('confirmModal')).show();
};

window.editarAgendamento = async function(id) {
    try {
        const agendamentos = await carregarAgendamentos();
        const agendamento = agendamentos.find(a => a.id === id);
        
        if (agendamento) {
            entrarModoEdicao(agendamento);
        } else {
            mostrarAlerta('Erro!', 'Agendamento não encontrado', 'error');
        }
    } catch (error) {
        console.error('Erro ao editar agendamento:', error);
        mostrarAlerta('Erro!', 'Não foi possível carregar o agendamento para edição', 'error');
    }
};
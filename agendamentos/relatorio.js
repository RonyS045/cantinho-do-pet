async function gerarRelatorioPDF() {
    try {
        const agendamentos = await carregarAgendamentos();
        
        // Verifica se há agendamentos
        if (agendamentos.length === 0) {
            Swal.fire('Atenção!', 'Não há agendamentos para gerar o relatório', 'warning');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Cabeçalho
        doc.setFontSize(18);
        doc.setTextColor(106, 17, 203);
        doc.text('Relatório de Agendamentos - Cantinho do Pet', 15, 15);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 15, 25);
        
        // Dados dos agendamentos
        const headers = [['Cliente', 'Serviço', 'Data', 'Hora', 'Valor']];
        const data = agendamentos.map(a => [
            a.nome,
            a.tipo,
            formatarData(a.data),
            a.hora,
            `R$ ${parseFloat(a.valor).toFixed(2)}`
        ]);
        
        // Tabela
        doc.autoTable({
            head: headers,
            body: data,
            startY: 30,
            headStyles: {
                fillColor: [106, 17, 203],
                textColor: 255
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            }
        });
        
        // Rodapé
        const total = agendamentos.reduce((sum, a) => sum + parseFloat(a.valor), 0);
        doc.setFontSize(12);
        doc.text(`Total de agendamentos: ${agendamentos.length}`, 15, doc.lastAutoTable.finalY + 10);
        doc.text(`Valor total: R$ ${total.toFixed(2)}`, 15, doc.lastAutoTable.finalY + 20);
        
        // Salva o PDF
        doc.save(`relatorio-cantinho-pet-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        Swal.fire('Erro!', 'Não foi possível gerar o relatório', 'error');
    }
}

function formatarData(dataString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dataString).toLocaleDateString('pt-BR', options);
}

async function carregarAgendamentos() {
    return (await localforage.getItem('agendamentos')) || [];
}
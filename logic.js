function solve(){
  const acc = document.getElementById('accident').value;
  const status = document.getElementById('status');
  const res = document.getElementById('result');
  res.innerHTML = '';

  const trees = {
    stuck_pipe: (typeof stuckPipeTree !== 'undefined') ? stuckPipeTree : null,
    pipe_failure: (typeof pipeFailureTree !== 'undefined') ? pipeFailureTree : null,
    circulation_loss: (typeof circulationLossTree !== 'undefined') ? circulationLossTree : null,
    kicks: (typeof kicksTree !== 'undefined') ? kicksTree : null,
    collapses: (typeof collapsesTree !== 'undefined') ? collapsesTree : null,
    motors: (typeof motorsTree !== 'undefined') ? motorsTree : null,
    tool_failure: (typeof toolFailureTree !== 'undefined') ? toolFailureTree : null
  };

  const tree = trees[acc];
  if (!tree) {
    status.textContent = 'Не найдено дерево для выбранного типа. Проверьте, что папка data и все .js файлы загружены в корень репозитория.';
    return;
  }

  status.textContent = 'Найдено решений: ' + tree.length;

  tree.forEach(r=>{
    const d=document.createElement('div');
    d.className='node';
    d.innerHTML = `<b>${r.stage}</b><br>${r.description}<br><i>Инструмент/оснастка: ${r.fishing}</i>`;
    res.appendChild(d);
  });
}

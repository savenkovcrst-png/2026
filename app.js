// ------------------------
// 1) База сценариев (расширяемая)
// ------------------------
// ВАЖНО: мы не копируем книгу, а кодируем инженерные правила.
// Для каждого incident создаём несколько "планов" (варианты решений).
// Каждый план = цепочка шагов, у каждого шага есть nextOk и nextFail.
const PLANS = {
  stuck_pipe: [
    {
      id: "A",
      title: "План A: мягкое освобождение → усиление",
      steps: [
        {
          id: "A1",
          name: "Диагностика: оценить тип прихвата и допустимые нагрузки",
          tool: "КИП, индикатор веса",
          fishing: "Не требуется",
          ok: "A2",
          fail: "A3"
        },
        {
          id: "A2",
          name: "Расхаживание / разгрузка-вытяжка (мягкий режим)",
          tool: "Лебёдка",
          fishing: "Не требуется",
          ok: "A4",
          fail: "A3"
        },
        {
          id: "A3",
          name: "Усиление: ясс/ударная нагрузка (вверх/вниз)",
          tool: "Ясс (мех/гидро)",
          fishing: "Ясс, ударная компоновка",
          ok: "A4",
          fail: "A5"
        },
        {
          id: "A4",
          name: "Успех: восстановить циркуляцию/очистку ствола и продолжить работы",
          tool: "Насосы, контроль параметров",
          fishing: "Не требуется",
          ok: null,
          fail: null
        },
        {
          id: "A5",
          name: "Неудача: переход к отвороту и ловильным работам",
          tool: "Комплект ловильных работ",
          fishing: "Овершот (колокол), метчик, фрезер (по ситуации)",
          ok: null,
          fail: null
        }
      ]
    },
    {
      id: "B",
      title: "План B: дифференциальный прихват → ванна → ясс",
      steps: [
        {
          id: "B1",
          name: "Проверка признаков дифференциального прихвата (плотность/фильтрация/контакт)",
          tool: "КИП, анализ раствора",
          fishing: "Не требуется",
          ok: "B2",
          fail: "B4"
        },
        {
          id: "B2",
          name: "Технологическая ванна (снижение прилипания, снижение фильтрации)",
          tool: "Ванна, насосы",
          fishing: "Не требуется",
          ok: "B3",
          fail: "B4"
        },
        {
          id: "B3",
          name: "Мягкое освобождение (вращение/разгрузка) после ванны",
          tool: "Ротор/TopDrive, лебёдка",
          fishing: "Не требуется",
          ok: "B5",
          fail: "B4"
        },
        {
          id: "B4",
          name: "Усиление: ясс + ударная компоновка",
          tool: "Ясс",
          fishing: "Ясс, ударная компоновка",
          ok: "B5",
          fail: "B6"
        },
        {
          id: "B5",
          name: "Успех: стабилизировать раствор и режим, проработка интервала",
          tool: "Насосы, контроль реологии",
          fishing: "Не требуется",
          ok: null,
          fail: null
        },
        {
          id: "B6",
          name: "Неудача: отворот → ловильные операции",
          tool: "Комплект ловильных работ",
          fishing: "Овершот (колокол), метчик, фрезер (по ситуации)",
          ok: null,
          fail: null
        }
      ]
    }
  ]
};

// ------------------------
// 2) Сбор данных формы
// ------------------------
function readInput() {
  return {
    position: document.getElementById("position").value,
    mudType: document.getElementById("mudType").value,
    mudDensity: +document.getElementById("mudDensity").value,
    mudViscosity: +document.getElementById("mudViscosity").value,
    fluidLoss: +document.getElementById("fluidLoss").value,
    bhaType: document.getElementById("bhaType").value,
    bitDiameter: +document.getElementById("bitDiameter").value,
    incident: document.getElementById("incident").value
  };
}

// ------------------------
// 3) Оценка эффективности шага (0..100)
// ------------------------
// Это "инженерный скоринг": корректирует эффективность по условиям.
function scoreStep(step, d) {
  let s = 65; // базовый уровень (потом корректируем)

  // Положение КНБК: в интервале осложнения хуже
  if (d.position === "in_trouble_zone") s -= 10;
  if (d.position === "on_bottom") s -= 5;

  // Тип КНБК: мотор и RSS могут осложнять ударные/расхаживание
  if (d.bhaType === "motor" && (step.name.toLowerCase().includes("ясс") || step.fishing.toLowerCase().includes("ясс"))) s -= 10;
  if (d.bhaType === "rss") s -= 5;

  // Раствор: высокая фильтрация увеличивает риск дифференциального прихвата
  if (d.fluidLoss > 10) s -= 12;
  if (d.fluidLoss > 15) s -= 18;

  // Низкая вязкость → хуже вынос шлама → выше риск “шламового” прихвата
  if (d.mudViscosity < 35) s -= 8;

  // Слишком высокая плотность часто повышает дифференциальную составляющую (условно)
  if (d.mudDensity > 1.35) s -= 10;

  // Тип раствора: OBM/SBM часто снижают риск прилипания (условно +)
  if (d.mudType === "obm" || d.mudType === "sbm") s += 6;

  // Диаметр: меньше диаметр — меньше зазор — выше риск осложнений в плохом стволе (условно -)
  if (d.bitDiameter < 120) s -= 4;

  // Ограничение
  if (s < 5) s = 5;
  if (s > 95) s = 95;
  return s;
}

function colorByScore(s) {
  if (s >= 70) return "good";
  if (s >= 40) return "mid";
  return "bad";
}

// ------------------------
// 4) Генерация Mermaid диаграммы
// ------------------------
function buildMermaid(plans, d) {
  // Mermaid flowchart + classDef для цветов
  let mm = `
flowchart TD
classDef good fill:#d7f5dd,stroke:#1b7f2a,color:#0b3d14;
classDef mid  fill:#fff0cc,stroke:#b36b00,color:#5a3300;
classDef bad  fill:#ffd6d6,stroke:#b00020,color:#5a0010;
classDef term fill:#e9eef6,stroke:#64748b,color:#0f172a;
`;

  plans.forEach((plan, idx) => {
    const prefix = plan.id; // A, B...
    mm += `subgraph ${prefix}["${plan.title}"]\n`;

    // создаём lookup
    const map = {};
    plan.steps.forEach(s => map[s.id] = s);

    // создаём ноды с оценкой
    plan.steps.forEach(step => {
      const sc = scoreStep(step, d);
      const cls = (step.ok === null && step.fail === null) ? "term" : colorByScore(sc);
      const safeLabel = step.name.replace(/"/g, "'");

      mm += `${step.id}["${safeLabel}<br/>Эффективность: ${sc}%"]:::${cls}\n`;
    });

    // соединения (успех/неудача)
    plan.steps.forEach(step => {
      if (step.ok) mm += `${step.id} -->|✅ удачно| ${step.ok}\n`;
      if (step.fail) mm += `${step.id} -->|❌ неудачно| ${step.fail}\n`;
    });

    mm += `end\n\n`;
  });

  return mm;
}

// ------------------------
// 5) UI: построить и отрендерить
// ------------------------
async function render() {
  const d = readInput();
  const plans = PLANS[d.incident] || [];
  const summary = document.getElementById("summary");
  const diagram = document.getElementById("diagram");

  if (!plans.length) {
    summary.innerHTML = "Нет планов для выбранного осложнения (нужно добавить в PLANS).";
    diagram.textContent = "";
    return;
  }

  summary.innerHTML = `
    <b>Входные условия:</b><br>
    Положение КНБК: ${d.position}<br>
    Раствор: ${d.mudType}, ρ=${d.mudDensity}, V=${d.mudViscosity}, WL=${d.fluidLoss}<br>
    Тип КНБК: ${d.bhaType}, Диаметр: ${d.bitDiameter} мм
  `;

  const mm = buildMermaid(plans, d);
  diagram.textContent = mm;

  // Перерисовка mermaid
  diagram.removeAttribute("data-processed");
  await mermaid.run({ querySelector: "#diagram" });
}

document.getElementById("buildBtn").addEventListener("click", () => {
  render().catch(err => {
    console.error(err);
    document.getElementById("summary").innerHTML =
      `<span style="color:red"><b>Ошибка построения схемы.</b> Откройте F12 → Console.</span>`;
  });
});

// первичный рендер
render().catch(()=>{});

(() => {
  "use strict";

  const root = document.getElementById("mh-lab");
  if (!root) return;

  const $ = id => document.getElementById(id);
  const doors = [...root.querySelectorAll(".mh-door")];
  const ui = {
    ruleCount: $("mh-rule-count"),
    doorCountInputs: [...root.querySelectorAll('input[name="mh-door-count"]')],
    instruction: $("mh-instruction"),
    round: $("mh-round"),
    decision: $("mh-decision"),
    stay: $("mh-stay"),
    stayCopy: $("mh-stay-copy"),
    switch: $("mh-switch"),
    switchCopy: $("mh-switch-copy"),
    result: $("mh-result"),
    resultIcon: $("mh-result-icon"),
    resultTitle: $("mh-result-title"),
    resultCopy: $("mh-result-copy"),
    next: $("mh-next"),
    reset: $("mh-reset"),
    total: $("mh-total"),
    stayWins: $("mh-stay-wins"),
    stayTotal: $("mh-stay-total"),
    stayRate: $("mh-stay-rate"),
    stayMeter: $("mh-stay-meter"),
    switchWins: $("mh-switch-wins"),
    switchTotal: $("mh-switch-total"),
    switchRate: $("mh-switch-rate"),
    switchMeter: $("mh-switch-meter"),
    tip: $("mh-tip"),
    explanation: $("mh-explanation")
  };

  let doorCount = 3;
  let score = {
    rounds: 0,
    stay: { wins: 0, total: 0 },
    switch: { wins: 0, total: 0 }
  };
  let game;

  function randomDoor() {
    return Math.floor(Math.random() * doorCount);
  }

  function doorIndexes() {
    return Array.from({ length: doorCount }, (_, index) => index);
  }

  function setPrize(door, prize) {
    const prizeNode = doors[door].querySelector(".mh-prize");
    prizeNode.textContent = prize === "car" ? "🚗" : "🐐";
    prizeNode.dataset.prize = prize;
  }

  function setDoorLabel(door, status) {
    const number = door + 1;
    const labels = {
      ready: `选择 ${number} 号门`,
      selected: `${number} 号门，你最初选择的门`,
      switchOption: `换到 ${number} 号门`,
      opened: `${number} 号门已打开，门后是羊`,
      car: `${number} 号门已打开，门后是汽车`,
      goat: `${number} 号门已打开，门后是羊`
    };
    doors[door].setAttribute("aria-label", labels[status]);
  }

  function startRound() {
    game = {
      car: randomDoor(),
      selected: null,
      opened: null,
      final: null,
      phase: "pick"
    };

    root.dataset.doorCount = doorCount;
    doors.forEach((door, index) => {
      const active = index < doorCount;
      door.hidden = !active;
      door.disabled = !active;
      door.className = "mh-door";
      door.querySelector(".mh-prize").textContent = "";
      delete door.querySelector(".mh-prize").dataset.prize;
      if (active) setDoorLabel(index, "ready");
    });
    ui.round.textContent = `第 ${score.rounds + 1} 轮`;
    ui.ruleCount.textContent = ["", "", "", "三", "四", "五"][doorCount];
    ui.instruction.textContent = `${doorCount} 扇门后藏着 1 辆汽车和 ${doorCount - 1} 只羊。你的第一选择是哪一扇？`;
    ui.decision.hidden = true;
    ui.result.hidden = true;
  }

  function chooseDoor(selected) {
    if (game.phase !== "pick") return;
    game.selected = selected;
    game.phase = "decide";

    const hostChoices = doorIndexes().filter(door => door !== selected && door !== game.car);
    game.opened = hostChoices[Math.floor(Math.random() * hostChoices.length)];

    doors.slice(0, doorCount).forEach((door, index) => {
      door.disabled = true;
      if (index === selected) {
        door.classList.add("is-selected");
        setDoorLabel(index, "selected");
      }
    });

    setPrize(game.opened, "goat");
    doors[game.opened].classList.add("is-open", "is-host-opened");
    setDoorLabel(game.opened, "opened");

    const remaining = doorIndexes().filter(door => door !== selected && door !== game.opened);
    ui.instruction.textContent = `你选择了 ${selected + 1} 号门。主持人打开 ${game.opened + 1} 号门，里面是一只羊。`;
    ui.stayCopy.textContent = `保留 ${selected + 1} 号门`;
    ui.switchCopy.textContent = remaining.length === 1
      ? `换到 ${remaining[0] + 1} 号门`
      : `从其他 ${remaining.length} 扇门中选择`;
    ui.decision.hidden = false;
    ui.stay.focus();
  }

  function beginSwitch() {
    if (game.phase !== "decide") return;
    game.phase = "switch-pick";
    ui.decision.hidden = true;
    ui.instruction.textContent = "请选择你要换到的门。";
    doorIndexes().forEach(index => {
      if (index === game.selected || index === game.opened) return;
      doors[index].disabled = false;
      doors[index].classList.add("is-switch-option");
      setDoorLabel(index, "switchOption");
    });
    const firstOption = doorIndexes().find(index => index !== game.selected && index !== game.opened);
    doors[firstOption].focus();
  }

  function finish(strategy, chosenDoor = game.selected) {
    const validPhase = strategy === "stay" ? game.phase === "decide" : game.phase === "switch-pick";
    if (!validPhase) return;
    game.phase = "finished";
    game.final = strategy === "stay" ? game.selected : chosenDoor;

    const won = game.final === game.car;
    score.rounds += 1;
    score[strategy].total += 1;
    if (won) score[strategy].wins += 1;

    doors.slice(0, doorCount).forEach((door, index) => {
      setPrize(index, index === game.car ? "car" : "goat");
      door.classList.add("is-open");
      door.classList.toggle("is-final", index === game.final);
      door.classList.toggle("is-winner", index === game.final && won);
      setDoorLabel(index, index === game.car ? "car" : "goat");
    });

    ui.decision.hidden = true;
    ui.result.hidden = false;
    ui.result.classList.toggle("is-win", won);
    ui.result.classList.toggle("is-loss", !won);
    ui.resultIcon.textContent = won ? "🚗" : "🐐";
    ui.resultTitle.textContent = won ? "猜中了！你赢得了汽车" : "这次是羊，汽车在另一扇门后";
    const action = strategy === "stay" ? "坚持原选择" : `从 ${game.selected + 1} 号门换到 ${game.final + 1} 号门`;
    ui.resultCopy.textContent = strategy === "stay"
      ? `你选择了${action}，最终打开 ${game.final + 1} 号门。`
      : `你选择${action}，最终打开 ${game.final + 1} 号门。`;
    ui.instruction.textContent = won ? "恭喜，本轮获胜。" : "本轮没有猜中，再试一次看看。";
    updateScore();
    ui.next.focus();
  }

  function percent(record) {
    return record.total ? 100 * record.wins / record.total : 0;
  }

  function updateStrategy(name) {
    const record = score[name];
    const rate = percent(record);
    ui[`${name}Wins`].textContent = record.wins;
    ui[`${name}Total`].textContent = record.total;
    ui[`${name}Rate`].textContent = record.total ? `${rate.toFixed(1)}%` : "—";
    ui[`${name}Meter`].style.width = `${rate}%`;
  }

  function updateScore() {
    ui.total.textContent = score.rounds;
    updateStrategy("stay");
    updateStrategy("switch");
  }

  function updateTip() {
    if (doorCount === 3) {
      ui.explanation.textContent = "第一次选中汽车的概率只有 1/3；选中羊的概率是 2/3。主持人排除一扇有羊的门后，换门会在最初选中羊的所有情形中获胜。";
    } else if (doorCount === 4) {
      ui.explanation.textContent = "第一次选中羊的概率是 3/4。主持人排除一扇羊门后，汽车位于其余 2 扇可换门中的概率相同，因此任选一扇换门的胜率为 (3/4) × (1/2) = 3/8。";
    } else {
      ui.explanation.textContent = "第一次选中羊的概率是 4/5。主持人排除一扇羊门后，汽车位于其余 3 扇可换门中的概率相同，因此任选一扇换门的胜率为 (4/5) × (1/3) = 4/15。";
    }
  }

  function resetExperiment() {
    score = {
      rounds: 0,
      stay: { wins: 0, total: 0 },
      switch: { wins: 0, total: 0 }
    };
    updateTip();
    ui.tip.open = false;
    updateScore();
    startRound();
    doors[0].focus();
  }

  doors.forEach(door => {
    door.addEventListener("click", () => {
      const selected = Number(door.dataset.door);
      if (game.phase === "pick") chooseDoor(selected);
      else if (game.phase === "switch-pick") finish("switch", selected);
    });
  });
  ui.stay.addEventListener("click", () => finish("stay"));
  ui.switch.addEventListener("click", beginSwitch);
  ui.next.addEventListener("click", () => {
    startRound();
    doors[0].focus();
  });
  ui.reset.addEventListener("click", resetExperiment);
  ui.doorCountInputs.forEach(input => input.addEventListener("change", () => {
    doorCount = Number(input.value);
    resetExperiment();
  }));

  updateTip();
  updateScore();
  startRound();
})();

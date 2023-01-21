const server_url = 'https://sql.lavro.ru/call.php';
const player_colors = ["#960000", "#030096", "#00960F", "#A7AA00"];
const resource_colors = {
  "Данные": "#2F82B4",
  "Металл": "#AF2B23",
  "Наноботы": "#744EA0",
  "Энергия": "#8CB721",
  "Универсальная": "#557282",
};
const resource_translation = {
  "Данные": "data",
  "Металл": "metal",
  "Наноботы": "nano",
  "Энергия": "energy",
  "Универсальная": "uni",
  "data": "Данные",
  "metal": "Металл",
  "nano": "Наноботы",
  "energy": "Энергия",
  "uni": "Универсальная",
}
const fixed_color = "#FCCF30";

let tk;
let user_login;
let user_player_index;
let room;
let exchange_panel = {
  from: undefined,
  to: undefined,
  res_to_give: undefined,
  res_to_take: undefined,
};
let players = [];
let cells = [];
let turn;
let is_your_turn_on_client = false;
let turn_changed = false;
let time;
let phase = -1;
let cube;
let res_left;
let dam_left;
let res_deck = [];
let dam_deck = [];
let protections = [];
let timeOutInterval;
let timer_timeOutInterval;
let pause_updating = false;
let game_finished = false;
let choose_card_listener_is_placed = false;
let is_exchange_from_you = false;
let is_exchange_to_you = false;
let is_any_exchange = false;

document.getElementById("login_button").onclick = function (event) {
  let login = document.getElementById("user_login").value;
  let psw = document.getElementById("user_password").value;
  room = document.getElementById("user_room").value;

  let fd = new FormData();
  fd.append('pname', 'sign_in');
  fd.append('db', '284196');
  fd.append('p1', login);
  fd.append('p2', psw);
  fd.append('format', 'columns_compact');

  call_function_with_formData(prepare_game, fd);
}

function call_function_with_formData(function_to_call, fd) {
  fetch(server_url, {
    method: 'POST',
    body: fd,
  })
    .then((response) => {
      if (!response.ok) {
        show_message("Ошибка сети");
      }
      return response.json();
    })
    .then((json) => {
      function_to_call(json);
    })
  //.catch(function (err) {
  //  show_message(err.message);
  //})
}

function show_message(s) {
  document.querySelector("#message").textContent = s;
}

function prepare_game(resp) {
  if (resp.RESULTS[0].error) {
    show_message(resp.RESULTS[0].rus_error[0]);
  }
  else {
    user_login = document.getElementById("user_login").value;
    tk = resp.RESULTS[0].token;
    first_update_game();
  }
}

///////////////////////////////////////////////////FIRST UPDATE///////////////////////////////////////////////////

function first_update_game() {
  let fd = new FormData();
  fd.append('pname', 'update_game_info');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
    }
    else {
      if (resp.RESULTS[0].notif) {
        show_message(resp.RESULTS[0].rus_notif[0]);
        resp.RESULTS.splice(0, 1);
      }
      for (i = 0; i < resp.RESULTS[2].login.length; i++) {
        players[i] = {
          login: resp.RESULTS[2].login[i],
          number: resp.RESULTS[2].number[i],
          actions_left: resp.RESULTS[2].actions_left[i],
          cards_to_take: resp.RESULTS[2].cards_to_take[i],
          location: resp.RESULTS[2].location[i],
          color: player_colors[i],
          hand: {
            "Данные": 0,
            "Металл": 0,
            "Наноботы": 0,
            "Энергия": 0,
            "Универсальная": 0,
          },
        }
        if (players[i].login === user_login)
          user_player_index = i;
      }
      for (i = 0; i < resp.RESULTS[3].type.length; i++) {
        let index = resp.RESULTS[4].type.indexOf(resp.RESULTS[3].type[i]);
        cells[index / 3] = {
          type: resp.RESULTS[3].type[i],
          action: resp.RESULTS[3].action[i],
          power_windows: [
            {
              resource: resp.RESULTS[3].resource_1[i],
              number: 1,
            },
            {
              resource: resp.RESULTS[3].resource_2[i],
              number: 2,
            },
            {
              resource: resp.RESULTS[3].resource_3[i],
              number: 3,
            },
          ],
          //resource_1: resp.RESULTS[3].resource_1[i],
          //resource_2: resp.RESULTS[3].resource_2[i],
          //resource_3: resp.RESULTS[3].resource_3[i],
          location: resp.RESULTS[4].location[index],
          powered: resp.RESULTS[4].powered[index],
          resource_windows: [
            {
              resource: resp.RESULTS[3].fix_1[i],
              number: resp.RESULTS[4].number[index],
              fixed: resp.RESULTS[4].fixed[index],
            },
            {
              resource: resp.RESULTS[3].fix_2[i],
              number: resp.RESULTS[4].number[index + 1],
              fixed: resp.RESULTS[4].fixed[index + 1],
            },
            {
              resource: resp.RESULTS[3].fix_3[i],
              number: resp.RESULTS[4].number[index + 2],
              fixed: resp.RESULTS[4].fixed[index + 2],
            },
          ],
        }
      }
      cells[8] = {
        type: "Ядро",
        action: "Когда энергия всех отсеков будет перенаправлена, переместитесь сюда и потратьте 1 дейсвтие, чтобы зарядить энергетическое ядро",
        location: 9,
        powered: 0,
        resource_windows: [
          {
            resource: null,
            number: null,
            fixed: null,
          },
          {
            resource: null,
            number: null,
            fixed: null,
          },
          {
            resource: null,
            number: null,
            fixed: null,
          },
        ],
      }
      first_show_game();
      update_game();
    }
  };

  call_function_with_formData(inner_function, fd);
}

///////////////////////////////////////////////////FIRST SHOW///////////////////////////////////////////////////

function first_show_game() {
  for (let cell of cells) {
    let cur_cell = document.querySelector("#c" + cell.location);
    cur_cell.querySelector(".cell_name").innerHTML = cell.type;
    cur_cell.querySelector(".cell_action").innerHTML = cell.action;
    if (cell.type !== "Ядро") {
      let cur_resources = cur_cell.querySelectorAll(".power_resource");
      cur_resources[0].textContent = cell.power_windows[0].resource;
      cur_resources[0].style.border = "0.1rem solid " + resource_colors[cell.power_windows[0].resource];
      cur_resources[1].textContent = cell.power_windows[1].resource;
      cur_resources[1].style.border = "0.1rem solid " + resource_colors[cell.power_windows[1].resource];
      cur_resources[2].textContent = cell.power_windows[2].resource;
      cur_resources[2].style.border = "0.1rem solid " + resource_colors[cell.power_windows[2].resource];
      cur_resources = cur_cell.querySelectorAll(".fix_resource");
      cur_resources[0].textContent = cell.resource_windows[0]?.resource;
      cur_resources[1].textContent = cell.resource_windows[1]?.resource;
      cur_resources[2].textContent = cell.resource_windows[2]?.resource;
    }
  }
}

///////////////////////////////////////////////////UPDATE GAME INFO///////////////////////////////////////////////////

function update_game() {
  let fd = new FormData();
  fd.append('pname', 'update_game_info');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
    }
    else {
      if (resp.RESULTS[0].notif) {
        game_finished = true;
        pause_game_update();
        let res = resp.RESULTS[0].rus_notif[0];
        show_message(res);
        resp.RESULTS.splice(0, 1);
        if (res === "Победа!") {
          announcement_show("Победа!");
          cells[8].powered = 1;
        }
        else {
          announcement_show("Поражение!");
        }
      }
      if (resp.RESULTS[0].exchange[0] !== "No exchange from you") {
        show_message(resp.RESULTS[0].exchange[0]);
      }
      if (resp.RESULTS[1].transportation[0] !== "No transportation from you") {
        show_message(resp.RESULTS[1].transportation[0]);
      }
      if (players.length < resp.RESULTS[2].login.length) {
        players.splice(resp.RESULTS[2].login.length, resp.RESULTS[2].login.length - players.length);
      }
      for (i = 0; i < resp.RESULTS[2].login.length; i++) {
        players[i].login = resp.RESULTS[2].login[i];
        if (players[i].login === user_login)
          user_player_index = i;
        players[i].number = resp.RESULTS[2].number[i];
        players[i].actions_left = resp.RESULTS[2].actions_left[i];
        players[i].cards_to_take = resp.RESULTS[2].cards_to_take[i];
        players[i].location = resp.RESULTS[2].location[i];
        players[i].hand = {
          "Данные": 0,
          "Металл": 0,
          "Наноботы": 0,
          "Энергия": 0,
          "Универсальная": 0,
        }
      }

      for (i = 0; i < resp.RESULTS[4].type.length; i += 3) {
        cells[i / 3].powered = resp.RESULTS[4].powered[i];
        cells[i / 3].resource_windows[0].fixed = resp.RESULTS[4].fixed[i];
        cells[i / 3].resource_windows[1].fixed = resp.RESULTS[4].fixed[i + 1];
        cells[i / 3].resource_windows[2].fixed = resp.RESULTS[4].fixed[i + 2];
      }
      turn = resp.RESULTS[5].player_number[0];
      time = resp.RESULTS[5].time_left[0] < 0 ? 0 : resp.RESULTS[5].time_left[0];
      cube = resp.RESULTS[5].cube_number[0];
      for (i = 0; i < resp.RESULTS[6].number.length; i++) {
        const res = resp.RESULTS[6].resource[i];
        players[resp.RESULTS[6].number[i] - 1].hand[res] = resp.RESULTS[6].count[i];
      }

      res_deck[0] = resp.RESULTS[7].resource[0];
      res_deck[1] = resp.RESULTS[7].resource[1];
      res_left = resp.RESULTS[8].number_of_resource_cards_in_deck[0];
      dam_deck = resp.RESULTS[9].damaged_cells;
      dam_left = resp.RESULTS[10].number_of_damage_cards_in_deck[0];
      protections = resp.RESULTS[11];

      phase_change(resp.RESULTS[5].phase[0] + 1);

      if (players[user_player_index].cards_to_take !== 0 && !choose_card_listener_is_placed) {
        if ((resp.RESULTS[5].phase[0] + 1) === 1)
          add_take_card_listener(search_choose);
        else
          add_take_card_listener(choose_card_2);
      }

      let exchange_result = resp.RESULTS[13];

      if (exchange_result.from_number[0] && exchange_result.approved[0] == null) {
        is_any_exchange = true;
        exhange_message_make(exchange_result.from_number[0], exchange_result.to_number[0], exchange_result.offer_resource[0], exchange_result.request_resource[0]);
        //Ваше предложение
        if (exchange_result.from_number[0] === user_player_index + 1) {
          is_exchange_from_you = true;
          is_exchange_to_you = false;
        }
        //Вам предложение
        else if (exchange_result.to_number[0] === user_player_index + 1) {
          is_exchange_from_you = false;
          is_exchange_to_you = true;
        }
        else {
          is_exchange_from_you = false;
          is_exchange_to_you = false;
        }
      }
      else {
        if (is_any_exchange)
          show_message("");
        is_any_exchange = false;
        is_exchange_from_you = false;
        is_exchange_to_you = false;
      }
      show_game();
    }
  };

  call_function_with_formData(inner_function, fd);

  if (!pause_updating && !game_finished)
    timeOutInterval = setTimeout(update_game, 5000);
}

function pause_game_update() {
  pause_updating = true;
  clearInterval(timeOutInterval);
}
function continue_game_update() {
  pause_updating = false;
  update_game();
}

///////////////////////////////////////////////////PHASE CHANGE///////////////////////////////////////////////////

//new phase: 1 or 2
function phase_change(new_phase) {
  if (phase === new_phase || game_finished)
    return;


  if (phase !== 2) {
    phase = new_phase;
    announcement_show("Фаза " + new_phase);
  }
  else {
    phase = new_phase;
    announcement_show("Фаза 3");
    setTimeout(() => { damage_anim() }, 2000);
    function damage_anim() {
      for (dam of dam_deck) {
        let result = cells.find(cell => {
          return cell.type === dam;
        })
        const cell_div = document.getElementById("c" + result.location);
        const back = document.createElement("div");
        back.classList.add("red_glowing");
        cell_div.insertBefore(back, cell_div.firstChild);
        show_damaged_cell();
        function show_damaged_cell(value = 0, i = 1, time_to_wait) {
          time_to_wait = 3;
          value += i;
          back.style.opacity = value / 100;

          if (value === 100) {
            time_to_wait = 1500;
            i *= -1;
          }
          else if (value === 0) {
            cell_div.removeChild(back);
            announcement_show("Фаза 1");
            return;
          }
          setTimeout(() => { show_damaged_cell(value, i) }, time_to_wait);
        }
      }
    }
  }

}

let cur_announcement_timeout;
const announcement_div = document.querySelector(".announcement_container");

function announcement_show(value) {
  if (cur_announcement_timeout)
    clearTimeout(cur_announcement_timeout);
  announcement_div.children[0].textContent = value;
  announcement_div.style.display = "flex";
  announcement_div.style.transform = "translate(0, 0)";
  let step = 100;
  let translate_step = 0;
  let fin_Step = step / 2;
  function announcement_move() {
    announcement_div.style.left = step + "vw";
    if (--step === fin_Step) {
      if (fin_Step !== 0)
        announcement_translete();
      else {
        cur_announcement_timeout = null;
        announcement_div.style.display = "none";
      }

      announcement_div.style.transform = "translate(0, 0)";
      return;
    }
    cur_announcement_timeout = setTimeout(() => { announcement_move() }, 1);
  }
  function announcement_translete() {

    announcement_div.style.transform = "translate(" + translate_step + "%, 0)";
    if (translate_step-- === -100) {
      fin_Step = 0;
      announcement_move();
      return;
    }
    cur_announcement_timeout = setTimeout(() => { announcement_translete() }, 14 - Math.abs(-50 - translate_step) / 5);
  }
  announcement_move();
};


///////////////////////////////////////////////////SHOW GAME///////////////////////////////////////////////////
const action_block = document.querySelector(".no_action");
const p1_buttons = [...document.querySelectorAll(".p1_button")];
const answer_cont = document.getElementById("exchange_answer_container");
const exchange_cancel_button = document.getElementById("exchange_cancel");
function show_action_panel() {
  /*show/disable action panel*/
  //Чужой ход
  if (turn !== user_player_index + 1 || game_finished) {
    if (is_your_turn_on_client) {
      p1_buttons.forEach((element) => {
        element.style.display = "none";
      });
      action_block.style.display = "block";
      is_your_turn_on_client = false;
    }
    if (answer_cont.style.display !== "flex" && is_exchange_to_you) {
      action_block.style.display = "none";
      answer_cont.style.display = "flex";
    }
    else if (answer_cont.style.display === "flex" && !is_exchange_to_you) {
      action_block.style.display = "block";
      answer_cont.style.display = "none";
    }
  }
  else {
    if (!is_your_turn_on_client) {
      p1_buttons.forEach((element) => {
        element.style.display = "block";
      });
      exchange_cancel_button.style.display = "none";
      action_block.style.display = "none";
      answer_cont.style.display = "none";
      is_your_turn_on_client = true;
    }
    if (exchange_cancel_button.style.display !== "block" && is_exchange_from_you) {
      p1_buttons.forEach((element) => {
        element.style.display = "none";
      });
      exchange_cancel_button.style.display = "block";
      action_block.style.display = "none";
      answer_cont.style.display = "none";
    }
    else if (exchange_cancel_button.style.display === "block" && !is_exchange_from_you) {
      p1_buttons.forEach((element) => {
        element.style.display = "block";
      });
      exchange_cancel_button.style.display = "none";
      action_block.style.display = "none";
      answer_cont.style.display = "none";
    }
  }

}
function show_players_info() {
  /*players info*/
  for (let player of players) {
    let cur_player = document.querySelector("#player_" + player.number);
    let login = cur_player.querySelector(".player_login");
    login.lastElementChild.textContent = (player.number === user_player_index + 1) ? player.login + " (Вы)" : player.login;
    login.firstElementChild.style.background = player.color;
    let info = cur_player.querySelector(".player_info");
    info.querySelector(".number").textContent = "Номер: " + player.number;
    info.querySelector(".actions_left").textContent = "Действий осталось: " + player.actions_left;
    info.querySelector(".cards_to_take").textContent = "Карт взять: " + player.cards_to_take;
    let player_cards = cur_player.querySelectorAll(".player_card");
    player_cards[0].lastElementChild.textContent = player.hand["Данные"];
    player_cards[1].lastElementChild.textContent = player.hand["Металл"];
    player_cards[2].lastElementChild.textContent = player.hand["Наноботы"];
    player_cards[3].lastElementChild.textContent = player.hand["Энергия"];
    player_cards[4].lastElementChild.textContent = player.hand["Универсальная"];
  }
  /*remove no user players*/
  for (let i = players.length + 1; i < 5; i++) {
    document.querySelector("#player_" + i).style.display = "none";
  }
}

function show_cells() {
  /*cell fixed, player location and powered info*/
  for (let cell of cells) {

    let cur_cell = document.querySelector("#c" + cell.location);
    cur_resources = cur_cell.querySelectorAll(".fix_resource");
    const fixed_change = function (window_el, window_data) {
      if (window_data.fixed === 1) {
        window_el.style.border = "none";
        window_el.style.background = resource_colors[window_data.resource];
      }
      else {
        window_el.style.border = "0.1rem solid " + resource_colors[window_data.resource];
        window_el.style.background = "none";
      }
    }
    fixed_change(cur_resources[0], cell.resource_windows[0]);
    fixed_change(cur_resources[1], cell.resource_windows[1]);
    fixed_change(cur_resources[2], cell.resource_windows[2]);

    cur_cell.querySelector(".shield_token").innerHTML = "";

    let cur_tokens = cur_cell.querySelectorAll(".player_token");
    for (let i = 0; i < players.length; i++) {
      if (cur_tokens[i].firstElementChild && players[i].location !== cell.location) {
        cur_tokens[i].firstElementChild.remove();
      }
      else if (!cur_tokens[i].firstElementChild && players[i].location === cell.location) {
        cur_tokens[i].innerHTML = '<svg width="100%" height="100%" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="#000" d="M256 54.99c-27 0-46.418 14.287-57.633 32.23-10.03 16.047-14.203 34.66-15.017 50.962-30.608 15.135-64.515 30.394-91.815 45.994-14.32 8.183-26.805 16.414-36.203 25.26C45.934 218.28 39 228.24 39 239.99c0 5 2.44 9.075 5.19 12.065 2.754 2.99 6.054 5.312 9.812 7.48 7.515 4.336 16.99 7.95 27.412 11.076 15.483 4.646 32.823 8.1 47.9 9.577-14.996 25.84-34.953 49.574-52.447 72.315C56.65 378.785 39 403.99 39 431.99c0 4-.044 7.123.31 10.26.355 3.137 1.256 7.053 4.41 10.156 3.155 3.104 7.017 3.938 10.163 4.28 3.146.345 6.315.304 10.38.304h111.542c8.097 0 14.026.492 20.125-3.43 6.1-3.92 8.324-9.275 12.67-17.275l.088-.16.08-.166s9.723-19.77 21.324-39.388c5.8-9.808 12.097-19.576 17.574-26.498 2.74-3.46 5.304-6.204 7.15-7.754.564-.472.82-.56 1.184-.76.363.2.62.288 1.184.76 1.846 1.55 4.41 4.294 7.15 7.754 5.477 6.922 11.774 16.69 17.574 26.498 11.6 19.618 21.324 39.387 21.324 39.387l.08.165.088.16c4.346 8 6.55 13.323 12.61 17.254 6.058 3.93 11.974 3.45 19.957 3.45H448c4 0 7.12.043 10.244-.304 3.123-.347 6.998-1.21 10.12-4.332 3.12-3.122 3.984-6.997 4.33-10.12.348-3.122.306-6.244.306-10.244 0-28-17.65-53.205-37.867-79.488-17.493-22.74-37.45-46.474-52.447-72.315 15.077-1.478 32.417-4.93 47.9-9.576 10.422-3.125 19.897-6.74 27.412-11.075 3.758-2.168 7.058-4.49 9.81-7.48 2.753-2.99 5.192-7.065 5.192-12.065 0-11.75-6.934-21.71-16.332-30.554-9.398-8.846-21.883-17.077-36.203-25.26-27.3-15.6-61.207-30.86-91.815-45.994-.814-16.3-4.988-34.915-15.017-50.96C302.418 69.276 283 54.99 256 54.99z"/></svg>';
        cur_tokens[i].firstElementChild.firstElementChild.setAttribute("fill", players[i].color);
      }
    }
    if (cell.powered === 1 && !cur_cell.classList.contains("powered_glowing")) {
      cur_cell.classList.add("powered_glowing");
      cur_cell.querySelector(".power_token").innerHTML = '<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120.36 122.88"><title>electric</title><path fill="#e0abff" d="M60.18,2.39l1.57,0-8.1,13.53A47.08,47.08,0,0,0,34.52,102l-3.6,13.12A60.18,60.18,0,0,1,60.18,2.39Zm10,47.71H83.66a3.54,3.54,0,0,1,3.54,3.54,3.49,3.49,0,0,1-.61,2l-40,67.26-6.49-2.53L52.73,74.26l-16,.27a3.52,3.52,0,0,1-3.09-5.31L75.12,0l6.54,2.29L70.17,50.1Zm20-39.69a60.19,60.19,0,0,1-30,112.34l-1.59,0,8-13.53A47.08,47.08,0,0,0,87,23.87l3.24-13.46Z" /></svg>'
    }
  }
}

function show_time() {
  let time_value = document.getElementById("time_value");
  time_value.textContent = time;
}

function start_time_flow() {
  clearInterval(timer_timeOutInterval);
  let time_value = document.getElementById("time_value");
  timer_timeOutInterval = setTimeout(time_flow, 1000);
  function time_flow() {
    let int_time = parseInt(time_value.textContent);
    if (int_time < 1)
      return;
    time_value.textContent = int_time - 1;
    timer_timeOutInterval = setTimeout(time_flow, 1000);
  }
}
function pause_time_flow() {
  clearTimeout(timer_timeOutInterval);
}
function show_cube() {
  if (cube !== null) {
    let cube_value = document.getElementById("cube_value");
    cube_value.textContent = cube;
  }
}
function show_turn_pointer() {
  let turn_cont = document.querySelector(".turn_pointer");
  turn_cont.remove();
  let cur_player = document.querySelector("#player_" + turn).querySelector(".player_login");
  cur_player.insertBefore(turn_cont, cur_player.querySelector("h3"));
}
function show_resource_deck() {
  /* resource deck */
  document.getElementById("resource_card_value").textContent = res_left;
  let resource_cards = document.querySelectorAll(".resource_card");
  resource_cards[1].firstElementChild.textContent = res_deck[1];
  resource_cards[2].firstElementChild.textContent = res_deck[0];
  resource_cards[1].style.background = resource_colors[res_deck[1]];
  resource_cards[2].style.background = resource_colors[res_deck[0]];
}
function show_damage_deck() {
  /* damage deck */
  document.getElementById("damage_card_value").textContent = dam_left;
  let damage_card = document.querySelector(".damage_cards").firstElementChild.nextElementSibling;
  let cells_damaged = damage_card.children;
  for (let i = 0; i < 3; i++) {
    if (dam_deck[i] !== undefined) {
      cells_damaged[i].style.display = "inline-block";
      cells_damaged[i].textContent = dam_deck[i];
    }
    else {
      cells_damaged[i].style.display = "none";
    }
  }
  if (dam_deck.length != 6) {
    damage_card.nextElementSibling.style.display = "none";
  }
  else {
    cells_damaged = damage_card.nextElementSibling.children;
    for (let i = 0; i < 3; i++) {
      cells_damaged[i].textContent = dam_deck[i + 3];
    }
  }
}
function show_protections() {
  /* protections */
  for (let i = 0; i < protections.location.length; i++) {
    for (let q = 0; q < protections.number_of_protections[i]; q++) {
      let shield = document.querySelector("#c" + protections.location[i]).querySelector(".shield_token");
      shield.innerHTML += '<svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 981.25 981.25" xml:space="preserve"><path stroke="#190924" stroke-width="20" d="M946.23,206.651c-0.3-23-18-42-40.899-44.101c-190.3-17.8-345.601-119.5-396.8-156.7c-10.7-7.8-25.2-7.8-35.9,0c-51.1,37.2-206.4,138.9-396.7,156.7c-22.9,2.101-40.5,21.101-40.9,44.101c-2.3,150.1,21.8,659.699,444.1,773.1c7.5,2,15.4,2,22.9,0C924.331,866.451,948.43,356.75,946.23,206.651z" /></svg>';
      shield.lastElementChild.firstElementChild.setAttribute("fill", players[protections.player_number[i] - 1].color);

      if (shield.childElementCount !== 1) {
        let x = 4 * (shield.childElementCount - 1);
        shield.lastElementChild.setAttribute("style", "transform:translate(-" + x + "px, -" + x + "px) ; z-index: -" + x);
      }
    }
  }
}
function show_game() {
  show_action_panel();
  show_cells();
  show_players_info();
  show_time();
  if (!game_finished)
    start_time_flow();
  else
    pause_time_flow();
  show_cube();
  show_turn_pointer()
  show_resource_deck();
  show_damage_deck();
  show_protections();

}

///////////////////////////////////////////////////Add Listener///////////////////////////////////////////////////

function add_listener(array, function_to_call, add_cancel_on_window, cancel_function_to_call, function_to_prepare_args, ...args) {

  function cancelListeners(from_listener) {
    array.forEach(function (element) {
      element.classList.remove('choose_glow');
      element.removeEventListener("click", listener);
    });
    window.removeEventListener("click", cancelListeners);
    if (from_listener !== true)
      cancel_function_to_call();
  };

  function listener(event) {
    event.stopPropagation();
    cancelListeners(true);
    const element = function_to_prepare_args(event.currentTarget, args);;
    function_to_call(element);
  };

  setTimeout(() => {
    array.forEach(function (element) {
      element.classList.add('choose_glow');
      element.addEventListener("click", listener);
    });
    if (add_cancel_on_window) {
      window.addEventListener("click", cancelListeners);
    }
  }, 1);
}

function add_take_card_listener(function_to_call) {
  const prepare_func = (el) => {
    const classes = el.getAttribute("class");
    const index_start = classes.search(/_\d/) + 1;
    return parseInt(classes.substring(index_start, index_start + 1));
  }
  choose_card_listener_is_placed = true;
  add_listener(
    [...document.querySelectorAll(".resource_card")],
    function_to_call,
    false,
    null,
    prepare_func
  );
}

///////////////////////////////////////////////////MOVE///////////////////////////////////////////////////


const move_button = document.getElementById("move");


move_button.addEventListener("click", function () {
  pause_game_update();
  let near_cells = [];
  let cur_loc = players[user_player_index].location;

  function filt(el) {
    let num = parseInt(el.getAttribute("id").substring(1));
    if ((cur_loc % 2) === (num % 2))
      return 0;
    if (cur_loc === 9 || num === 9 || Math.abs(num - cur_loc) === 1 || Math.abs(num - cur_loc) === 7)
      return 1;
    return 0;
  }

  near_cells = document.querySelectorAll(".cell")
  near_cells = [...near_cells].filter(filt);

  add_listener(near_cells, move, true, continue_game_update, ((el) => { return parseInt(el.getAttribute("id").slice(-1)) }));

});

function move(to_cell) {
  let fd = new FormData();
  fd.append('pname', 'move');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room);
  fd.append('p3', to_cell);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
      continue_game_update();
      return;
    }
    show_message("");
    players[user_player_index].location = resp.RESULTS[0].location[0];
    players[user_player_index].actions_left = resp.RESULTS[0].actions_left[0];
    phase_change(resp.RESULTS[1].phase[0] + 1);

    show_players_info();
    show_cells();
    setTimeout(() => { continue_game_update() }, 2000);
  }

  call_function_with_formData(inner_function, fd);
}

///////////////////////////////////////////////////FIX///////////////////////////////////////////////////


const fix_button = document.getElementById("fix");

fix_button.addEventListener("click", function () {
  pause_game_update();
  const cur_loc = players[user_player_index].location;
  const cur_cell = document.getElementById("c" + cur_loc);
  let available_windows_elements = [];
  let fix_window_number = -1;

  cells[cur_loc - 1].resource_windows.forEach((el) => {
    if (el.fixed === 0)
      available_windows_elements.push(cur_cell.querySelector(".f" + el.number));
  });

  if (available_windows_elements.length === 0) {
    show_message("Отсек уже полностью починен!");
    return;
  }
  const prepare_func = (el) => {
    const classes = el.getAttribute("class");
    const index_start = classes.search(/f\d/) + 1;
    return parseInt(classes.substring(index_start, index_start + 1));
  }
  add_listener(available_windows_elements, fix_choose_materials, true, continue_game_update, prepare_func);


  function fix_choose_materials(fix_window) {
    fix_window_number = fix_window;
    const cur_player = document.getElementById("player_" + (user_player_index + 1));
    const res_required = cells[cur_loc - 1].resource_windows[fix_window - 1].resource;

    let hand_elements = [];
    if (players[user_player_index].hand["Универсальная"] > 0)
      hand_elements.push(cur_player.querySelector(".uni"));

    if (players[user_player_index].hand[res_required] > 0)
      hand_elements.push(cur_player.querySelector("." + resource_translation[res_required]));

    if (hand_elements.length === 0)
      show_message("У вас нет подходящих карт!");
    else {
      const prepare_func = (el, required_resource) => {
        if (el.classList.contains(required_resource[0]))
          return resource_translation[required_resource[0]];
        else
          return "Универсальная";
      }
      add_listener(hand_elements, fix, true, continue_game_update, prepare_func, resource_translation[res_required]);
    }
  }

  function fix(resource) {
    let fd = new FormData();
    fd.append('pname', 'fix');
    fd.append('db', '284196');
    fd.append('p1', tk);
    fd.append('p2', room);
    fd.append('p3', fix_window_number);
    fd.append('p4', resource);
    fd.append('format', 'columns_compact');

    const inner_function = function (resp) {
      if (resp.RESULTS[0].error) {
        show_message(resp.RESULTS[0].rus_error[0]);
        continue_game_update();
        return;
      }

      show_message("");
      cells[cur_loc - 1].resource_windows.forEach((el) => { el.fixed = resp.RESULTS[0].fixed[el.number - 1]; });
      players[user_player_index].hand[resource]--;
      players[user_player_index].actions_left--;
      phase_change(resp.RESULTS[3].phase[0] + 1);

      show_players_info();
      show_cells();
      setTimeout(() => { continue_game_update() }, 2000);
    }
    call_function_with_formData(inner_function, fd);
  }
});

///////////////////////////////////////////////////POWER///////////////////////////////////////////////////

const power_button = document.getElementById("power");

power_button.addEventListener("click", function () {
  pause_game_update();
  const cur_loc = players[user_player_index].location;
  if (cells[cur_loc - 1].powered === 1) {
    show_message("Питание из отсека уже перенаправлено!");
    continue_game_update();
    return;
  }
  if (cur_loc === 9) {
    power(['', '', '']);
  }
  const cur_cell = document.getElementById("c" + cur_loc);
  let power_window_elements = [...cur_cell.querySelectorAll(".power_resource")];
  const selected_resources = [];

  const prepare_func_1 = (el) => {
    const classes = el.getAttribute("class");
    const index_start = classes.search(/p\d/) + 1;
    return parseInt(classes.substring(index_start, index_start + 1));
  }

  function addListenerIter() {
    if (selected_resources.length === 3)
      power(selected_resources);
    else
      add_listener(power_window_elements, power_choose_materials, true, continue_game_update, prepare_func_1);
  };
  addListenerIter();

  function power_choose_materials(power_window) {
    const cur_player = document.getElementById("player_" + (user_player_index + 1));
    const res_required = cells[cur_loc - 1].power_windows[power_window - 1].resource;

    power_window_elements = power_window_elements.filter((el) => { return !el.classList.contains("p" + power_window) });
    let hand_elements = [];
    if (players[user_player_index].hand["Универсальная"] > 0) {
      hand_elements.push(cur_player.querySelector(".uni"));
    }
    if (players[user_player_index].hand[res_required] > 0) {
      hand_elements.push(cur_player.querySelector("." + resource_translation[res_required]));
    }
    if (hand_elements.length === 0) {
      show_message("У вас нет подходящих карт!");
      continue_game_update();
      return;
    }
    else {
      const prepare_func_2 = (el, required_resource) => {
        if (el.classList.contains(required_resource[0])) {
          selected_resources.push(resource_translation[required_resource[0]]);
          players[user_player_index].hand[res_required]--;
        }
        else {
          selected_resources.push("Универсальная");
          players[user_player_index].hand["Универсальная"]--;
        }
        show_game();
      }
      add_listener(hand_elements, addListenerIter, true, continue_game_update, prepare_func_2, resource_translation[res_required]);
    }
  }

  function power(resources) {
    let fd = new FormData();
    fd.append('pname', 'power');
    fd.append('db', '284196');
    fd.append('p1', tk);
    fd.append('p2', room);
    fd.append('p3', resources[0]);
    fd.append('p4', resources[1]);
    fd.append('p5', resources[2]);
    fd.append('format', 'columns_compact');

    const inner_function = function (resp) {
      if (resp.RESULTS[0].error) {
        show_message(resp.RESULTS[0].rus_error[0]);
        continue_game_update()
        return;
      }
      show_message("");
      cells[cur_loc - 1].powered = 1;
      players[user_player_index].actions_left--;
      phase_change(resp.RESULTS[3].phase[0] + 1);

      show_players_info();
      show_cells();
      setTimeout(() => { continue_game_update() }, 2000);
    }
    call_function_with_formData(inner_function, fd);
  }
});


///////////////////////////////////////////////////SEARCH///////////////////////////////////////////////////

const search_button = document.getElementById("search");

search_button.addEventListener("click", function () {
  pause_game_update();
  search();
});

function search() {
  let fd = new FormData();
  fd.append('pname', 'search');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
      continue_game_update();
      return;
    }
    show_message("");
    cube = resp.RESULTS[0].cube[0];
    players[user_player_index].cards_to_take = resp.RESULTS[1].cards_to_take[0];

    const dice_anim_time = dice_animation(cube);
    setTimeout(() => {
      phase_change(resp.RESULTS[2].phase[0] + 1);
      show_players_info();

      if (cube > 2) {
        add_take_card_listener(search_choose);
      }
      else {
        continue_game_update();
      }
    }, dice_anim_time);
  }
  call_function_with_formData(inner_function, fd);
}

function search_choose(card_number) {
  let fd = new FormData();
  fd.append('pname', 'search_choose_card');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room);
  fd.append('p3', card_number);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
      continue_game_update();
      return;
    }
    show_message("");
    choose_card_listener_is_placed = false;
    players[user_player_index].hand[resp.RESULTS[0].resource]++;
    res_deck[0] = resp.RESULTS[1].resource[0];
    res_deck[1] = resp.RESULTS[1].resource[1];
    res_left = resp.RESULTS[2].number_of_resource_cards_in_deck[0];
    players[user_player_index].actions_left = resp.RESULTS[3].actions_left[0];
    players[user_player_index].cards_to_take = resp.RESULTS[3].cards_to_take[0];
    phase_change(resp.RESULTS[4].phase[0] + 1);
    show_players_info();
    show_resource_deck();

    setTimeout(() => {
      if (players[user_player_index].cards_to_take !== 0 && phase === 1) {
        add_take_card_listener(search_choose)
      }
      else {
        continue_game_update();
      }
    }, 1000);
  }
  call_function_with_formData(inner_function, fd);
}

///////////////////////////////////////////////////Dice animation///////////////////////////////////////////////////

function dice_animation(last_number) {
  //~1160 secs
  const dice = document.querySelector(".cube");
  const dice_value = dice.querySelector("#cube_value");
  let i = 0;
  const max_steps = 20;
  const step_time_ms = 30;
  const iter = () => {
    if (++i === max_steps) {
      iter2();
      return;
    }
    dice.style.transform = "scale(" + (1 + i * 0.05) + ")";
    dice_value.textContent = Math.round(Math.random() * 5) + 1;
    setTimeout(iter, step_time_ms);
  };
  const iter2 = () => {
    if (--i === 0) {
      dice.style.transform = "scale(1)";
      dice_value.textContent = last_number;
      return;
    }
    dice.style.transform = "scale(" + (1 + i * 0.05) + ")";
    dice_value.textContent = Math.round(Math.random() * 5) + 1;
    setTimeout(iter2, step_time_ms);
  };
  iter();
  return max_steps * 2 * step_time_ms;
}
///////////////////////////////////////////////////SKIP///////////////////////////////////////////////////

const skip_button = document.getElementById("skip");

skip_button.addEventListener("click", function () {
  pause_game_update();
  skip();
});

function skip() {
  let fd = new FormData();
  fd.append('pname', 'skip');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
      continue_game_update();
      return;
    }

    show_message("");
    phase_change(resp.RESULTS[0].phase[0] + 1);

    setTimeout(() => { continue_game_update() }, 1000);

  }
  call_function_with_formData(inner_function, fd);
}

///////////////////////////////////////////////////CHOOSE CARD 2///////////////////////////////////////////////////

function choose_card_2(card_number) {
  let fd = new FormData();
  fd.append('pname', 'choose_card_2');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room);
  fd.append('p3', card_number);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
      continue_game_update();
      return;
    }

    show_message("");
    choose_card_listener_is_placed = false;

    continue_game_update();

  }
  call_function_with_formData(inner_function, fd);
}

///////////////////////////////////////////////////EXCHANGE///////////////////////////////////////////////////

const exchange_button = document.getElementById("exchange");

exchange_button.addEventListener("click", function () {
  pause_game_update();
  const cur_loc = players[user_player_index].location;

  function filt(pl) {
    for (let player of players) {
      if (player.login === pl.querySelector(".player_login").querySelector("h3").textContent && player.location === cur_loc)
        return 1;
    }
    return 0;
  }

  available_players = document.querySelectorAll(".player")
  available_players = [...available_players].filter(filt);
  if (available_players.length === 0) {
    show_message("В отсеке нет других игроков!");
    continue_game_update();
    return;
  }

  add_listener(available_players, choose_card_to_exchange, true, continue_game_update, ((el) => { return parseInt(el.getAttribute("id").slice(-1)) }));

  function choose_card_to_exchange(player_number) {
    function filt(crd) {
      return crd.querySelector(".card_value").textContent != 0;
    }

    your_available_cards = document.getElementById("player_" + (user_player_index + 1)).querySelectorAll(".player_card");
    player_available_cards = document.getElementById("player_" + player_number).querySelectorAll(".player_card");

    all_available_cards = [...your_available_cards, ...player_available_cards].filter(filt);
    if (all_available_cards.length === 0) {
      show_message("Нет доступных карт для обмена!");
      continue_game_update();
      return;
    }

    function prepare_func(el, player_num) {
      const arr = [, ,];
      arr[0] = el.classList[0];
      arr[1] = parseInt(el.parentNode.parentNode.getAttribute("id").slice(-1));
      arr[2] = player_num[0];
      return arr;
    }

    add_listener(all_available_cards, exchange, true, continue_game_update, prepare_func, player_number);
  }
});

function exchange(card_and_players) {

  let card_to_give = '';
  let card_to_take = '';
  if (card_and_players[1] === user_player_index + 1) {
    card_to_give = resource_translation[card_and_players[0]];
  }
  else {
    card_to_take = resource_translation[card_and_players[0]];
  }

  let fd = new FormData();
  fd.append('pname', 'exchange');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room);
  fd.append('p3', card_and_players[2]);
  fd.append('p4', card_to_give);
  fd.append('p5', card_to_take);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
      continue_game_update();
      return;
    }

    exhange_message_make(resp.RESULTS[0].from_number[0], resp.RESULTS[0].to_number[0], resp.RESULTS[0].offer_resource[0], resp.RESULTS[0].request_resource[0]);
    is_exchange_from_you = true;


    continue_game_update();

  }
  call_function_with_formData(inner_function, fd);
}

function exhange_message_make(from_num, to_num, res_off, res_req) {
  let from_log;
  let to_log;
  for (let pl of players) {
    if (pl.number === from_num)
      from_log = pl.login;
    if (pl.number === to_num)
      to_log = pl.login;
  }

  let correct_word1 = "";
  let correct_word2 = "";
  if (res_off != null) {
    correct_word1 = ` Игрок ${from_log} отдает карту ${res_off} игроку ${to_log}`;
  }
  else if (res_req != null) {
    correct_word2 = ` Игрок ${to_log} отдает карту ${res_req} игроку ${from_log}`;
  }
  show_message(`Предложение обмена:${correct_word1}${correct_word2}`);
}

///////////////////////////////////////////////////EXCHANGE CANCEL///////////////////////////////////////////////////

exchange_cancel_button.addEventListener("click", function () {
  pause_game_update();
  let fd = new FormData();
  fd.append('pname', 'exchange_cancel');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
      continue_game_update();
      return;
    }

    show_message("");
    is_exchange_from_you = false;
    p1_buttons.forEach((element) => {
      element.style.display = "block";
    });
    exchange_cancel_button.style.display = "none";
    action_block.style.display = "none";
    answer_cont.style.display = "none";
    continue_game_update();
  }
  call_function_with_formData(inner_function, fd);

});

///////////////////////////////////////////////////EXCHANGE ANSWER///////////////////////////////////////////////////
document.getElementById("exchange_yes").addEventListener("click", function () {
  exchange_answer(1);
});
document.getElementById("exchange_no").addEventListener("click", function () {
  exchange_answer(0);
});

function exchange_answer(answer) {
  pause_game_update();
  let fd = new FormData();
  fd.append('pname', 'exchange_answer');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room);
  fd.append('p3', answer);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
      continue_game_update();
      return;
    }
    if (answer)
      show_message("Обмен подтвержден!");
    else
      show_message("Отказ от обмена");

    is_exchange_to_you = false;
    action_block.style.display = "block";
    answer_cont.style.display = "none";
    setTimeout(continue_game_update, 2000);
  }
  call_function_with_formData(inner_function, fd);
}
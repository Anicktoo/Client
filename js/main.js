
const server_url = 'https://sql.lavro.ru/call.php';

let timeOutInterval;
let pause_updating = false;
let rooms = [];
let tk;
let login;

class Room {
  id;
  admin;
  dif;
  time;
  hasPassw;
  playersInRoom;
  gameStarted;
  guests;
  element;
  container;
  in_room_now;
  static hidden_room = document.querySelector("#hidden_room");
  static hidden_in_room = document.querySelector("#hidden_in_room");
  static room_container = document.querySelector(".room_container");
  static in_room_container = document.querySelector(".in_room_container");


  constructor(id, admin, dif, time, hasPassw, playersInRoom, gameStarted, prev, in_room, guests) {
    this.id = id;
    this.admin = admin;
    this.dif = dif;
    this.time = time;
    this.hasPassw = hasPassw;
    this.playersInRoom = playersInRoom;
    this.gameStarted = gameStarted;
    this.container = in_room ? Room.in_room_container : Room.room_container;
    this.in_room_now = in_room;
    this.guests = guests;
    this.createRoom(prev);
  }

  createRoom(prevEl = this.in_room_now ? Room.hidden_in_room : Room.hidden_room) {
    this.element = Room.hidden_room.cloneNode(true);
    this.element.setAttribute("id", `${this.id}`);
    this.element.querySelector(".room-value-id").textContent = `${this.id}`;
    this.element.querySelector(".room-value-dif").textContent = `${this.dif}`;
    this.element.querySelector(".room-value-time").textContent = `${this.time}`;
    if (this.hasPassw) {
      this.element.querySelector(".no-room-psw").style.display = "none";
    }
    else {
      this.element.querySelector(".room-password").style.display = "none";
    }
    this.element.querySelector(".game-start-button").addEventListener("click", () => { startGame(this) });
    this.element.querySelector(".game-in-button").addEventListener("click", () => { toGame(this) });
    this.element.querySelector(".room-enter-button").addEventListener("click", () => { enter_room(this) });
    this.element.querySelector(".exit-room").addEventListener("click", () => { exit_room(this) });
    this.updateRoom(this.admin, this.gameStarted, this.playersInRoom, this.in_room_now, this.guests);
    this.container.insertBefore(this.element, prevEl.nextSibling);
  }

  updateRoom(admin, game_started, players_in_room, is_in_room, guests) {
    this.admin = admin;
    this.gameStarted = game_started;
    this.playersInRoom = players_in_room;
    this.guests = guests;
    this.element.querySelector(".room-value-admin").textContent = `${this.admin}`;
    const join_field = this.element.querySelector(".room-value-join");
    [...join_field.children].forEach(el => el.style.display = "none");
    let prev_field = join_field;
    for (let i = 0; i < 4; i++) {
      prev_field = prev_field.previousSibling.previousSibling;
      prev_field.style.display = "block";
    }

    //Не в комнате (Слева)
    if (!is_in_room) {
      //Убрать из войденных комнаты (<-)
      if (this.in_room_now) {
        this.in_room_now = is_in_room;
        this.container = Room.room_container;
        let prev = rooms.findLast(el => el.id < this.id && !el.in_room_now)?.element;
        if (!prev) prev = hidden_room;
        this.container.insertBefore(this.element, prev.nextSibling);
      }
      if (this.gameStarted) {
        let prev_field = join_field;
        for (let i = 0; i < 4; i++) {
          prev_field = prev_field.previousSibling.previousSibling;
          prev_field.style.display = "none";
        }
        join_field.querySelector(".game-started").style.display = "block";
        join_field.style.gridColumn = "-4/-1";
      }
      else {
        join_field.querySelector(".room-enter-button").style.display = "inline-block";
        this.element.querySelector(".room-header-players").firstElementChild.textContent = "Ожидающих в комнате";
        this.element.querySelector(".room-value-players").textContent = `${this.playersInRoom}`;
        join_field.style.gridColumn = "-2/-1";
      }
    }
    //В комнате (Справа)
    else {
      const close = this.element.querySelector(".exit-room");
      close.style.display = "block";
      //Добавить в войденную комнату (->)
      if (!this.in_room_now) {
        this.in_room_now = is_in_room;
        this.container = Room.in_room_container;
        let prev = rooms.findLast(el => el.id < this.id && el.in_room_now)?.element;
        if (!prev) prev = hidden_in_room;
        this.container.insertBefore(this.element, prev.nextSibling);
      }
      //Перейти к игре
      if (this.gameStarted) {
        let prev_field = join_field;
        for (let i = 0; i < 4; i++) {
          prev_field = prev_field.previousSibling.previousSibling;
          prev_field.style.display = "none";
        }
        join_field.style.gridColumn = "-4/-1";
        this.element.querySelector(".game-in-button").style.display = "block";
      }
      //Ожидание
      else {
        let prev_field = join_field;
        for (let i = 0; i < 2; i++) {
          prev_field = prev_field.previousSibling.previousSibling;
          prev_field.style.display = "none";
        }
        join_field.style.gridColumn = "-3/-1";
        this.element.querySelector(".room-header-players").firstElementChild.textContent = "Гости в комнате";
        this.element.querySelector(".room-value-players").textContent = this.guests.toString();
        //Начать
        if (this.admin === login) {
          if (this.playersInRoom > 1) {
            this.element.querySelector(".game-start-button").style.display = "block";
          }
          else { //Ожид
            this.element.querySelector(".guests-waiting").style.display = "block";
          }
        }
        else {
          this.element.querySelector(".admin-waiting").style.display = "block";
        }
      }
    }
  }
  deleteRoom() {
    this.container.removeChild(this.element);
  }
}

function show_message(s) {
  document.querySelector("#message").textContent = s;
}

document.getElementById("login_button").onclick = function (event) {
  let login_loc = document.getElementById("user_login").value;
  let psw_psw = document.getElementById("user_password").value;

  let fd = new FormData();
  fd.append('pname', 'sign_in');
  fd.append('db', '284196');
  fd.append('p1', login_loc);
  fd.append('p2', psw_psw);
  fd.append('format', 'columns_compact');

  function prepare_game(resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
    }
    else {
      login = login_loc;
      tk = resp.RESULTS[0].token[0];
      sessionStorage.setItem("login", login_loc);
      sessionStorage.setItem("tk", resp.RESULTS[0].token[0]);
      showRooms();
      update_info();
    }
  }
  call_function_with_formData(prepare_game, fd);
}


document.getElementById("reg_button").onclick = function (event) {
  let login_loc = document.getElementById("user_login").value;
  let psw_loc = document.getElementById("user_password").value;

  let fd = new FormData();
  fd.append('pname', 'reg_new_user');
  fd.append('db', '284196');
  fd.append('p1', login_loc);
  fd.append('p2', psw_loc);
  fd.append('format', 'columns_compact');

  function prepare_game(resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
    }
    else {
      login = login_loc;
      tk = resp.RESULTS[0].token[0];
      sessionStorage.setItem("login", login_loc);
      sessionStorage.setItem("tk", resp.RESULTS[0].token[0]);
      showRooms();
      update_info();
    }
  }
  call_function_with_formData(prepare_game, fd);
}

function showRooms() {
  document.querySelector(".room_container").style.display = "block";
  document.querySelector(".right_container").style.display = "flex";
  document.querySelector("#add-room").style.display = "block";
  // document.querySelector(".login_container").style.display = "none";
  const log_label = document.querySelector("#login_label");
  log_label.style.display = "inline-block";
  log_label.textContent = "Ваш логин: " + login;
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
}

///////////////////////////////////////////////////UPDATE INFO///////////////////////////////////////////////////

function update_info(tk_check) {
  let fd = new FormData();
  fd.append('pname', 'update_info');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      if (!tk_check)
        show_message(resp.RESULTS[0].rus_error[0]);
    }
    else {
      if (tk_check) {
        showRooms();
      }
      const in_rooms = resp.RESULTS[0];
      const in_rooms_guests = resp.RESULTS[1];
      const rooms_resp = resp.RESULTS[2];
      let i;
      let in_r_g = 0;
      let guests = [];
      let in_r = 0;
      for (i = 0; i < rooms_resp.id.length; i++) {
        guests = [];
        while (in_rooms_guests && in_rooms_guests.waiting_in_room_as_guest[in_r_g] < rooms_resp.id[i]) {
          in_r_g++;
        }
        while (in_rooms_guests && in_rooms_guests.waiting_in_room_as_guest[in_r_g] === rooms_resp.id[i]) {
          guests.push(in_rooms_guests.room_guests[in_r_g]);
          in_r_g++;
          if (in_rooms_guests && in_rooms_guests.waiting_in_room_as_guest[in_r_g] !== rooms_resp.id[i]) {
            in_r_g--;
            break;
          }
        }
        if (in_rooms && in_rooms.you_started_game_in_room[in_r] < rooms_resp.id[i]) {
          in_r++;
        }
        if (!rooms[i]) {
          let prev = rooms[i - 1];
          let in_room_now = rooms_resp.admin[i] === login;
          if (in_rooms.you_started_game_in_room[in_r] === rooms_resp.id[i] ||
            in_rooms_guests.waiting_in_room_as_guest[in_r_g] === rooms_resp.id[i]) {
            prev = rooms.find(element =>
              element.id === in_rooms.you_started_game_in_room[in_r - 1] ||
              element.id === in_rooms_guests.waiting_in_room_as_guest[in_r_g]);
            in_room_now = true;
          }
          rooms.push(new Room(
            rooms_resp.id[i],
            rooms_resp.admin[i],
            rooms_resp.difficulty[i],
            rooms_resp.turn_time[i],
            rooms_resp.has_password[i] === 1,
            rooms_resp.players_in_room[i],
            rooms_resp.game_started[i] === 1,
            prev,
            in_room_now,
            in_room_now ? guests : null
          ));
        }
        else if (rooms[i].id < rooms_resp.id[i]) {
          rooms[i].deleteRoom();
          rooms = [...rooms.slice(0, i), ...rooms.slice(i + 1, rooms.length)];
          i--;
          continue;
        }
        else if (rooms[i].id > rooms_resp.id[i]) {
          let prev = rooms[i - 1];
          let in_room_now = rooms_resp.admin[i] === login;
          if (in_rooms.you_started_game_in_room[in_r] === rooms_resp.id[i] ||
            in_rooms_guests.waiting_in_room_as_guest[in_r_g] === rooms_resp.id[i]) {
            prev = rooms.find(element =>
              element.id === in_rooms.you_started_game_in_room[in_r - 1] ||
              element.id === in_rooms_guests.waiting_in_room_as_guest[in_r_g]);
            in_room_now = true;
          }
          rooms.splice(i, 0, new Room(
            rooms_resp.id[i],
            rooms_resp.admin[i],
            rooms_resp.difficulty[i],
            rooms_resp.turn_time[i],
            rooms_resp.has_password[i] === 1,
            rooms_resp.players_in_room[i],
            rooms_resp.game_started[i] === 1,
            prev,
            in_room_now,
            in_room_now ? guests : null
          ));
        }
        else {
          let in_room_now = rooms_resp.admin[i] === login;
          if (in_rooms.you_started_game_in_room[in_r] === rooms_resp.id[i] ||
            in_rooms_guests.waiting_in_room_as_guest[in_r_g] === rooms_resp.id[i]) {
            in_room_now = true;
          }
          rooms[i].updateRoom(rooms_resp.admin[i],
            rooms_resp.game_started[i] === 1,
            rooms_resp.players_in_room[i],
            in_rooms.you_started_game_in_room[in_r] === rooms_resp.id[i] ||
            in_rooms_guests.waiting_in_room_as_guest[in_r_g] === rooms_resp.id[i] ||
            rooms_resp.admin[i] === login,
            in_room_now ? guests : null);

        }
        if (rooms_resp.id[i] === in_rooms_guests.waiting_in_room_as_guest[in_r_g]) guests = [];
      }
      for (let j = rooms_resp.id.length; j < rooms.length; j++) {
        rooms[j].deleteRoom();
      }
      rooms = rooms.slice(0, i);
    }
  }

  call_function_with_formData(inner_function, fd);
  if (!pause_updating) {
    timeOutInterval = setTimeout(update_info, 5000);
  }
}


function pause_update() {
  pause_updating = true;
  clearInterval(timeOutInterval);
}
function continue_update() {
  pause_updating = false;
  update_info();
}
///////////////////////////////////////////////////ENTER ROOM///////////////////////////////////////////////////

function enter_room(room) {
  pause_update();

  let fd = new FormData();
  fd.append('pname', 'enter_room');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room.id);
  fd.append('p3', room.element.querySelector(".room-password").value);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
    }
    else {
      show_message("");
    }
    continue_update();
  }

  call_function_with_formData(inner_function, fd);
}
///////////////////////////////////////////////////EXIT ROOM///////////////////////////////////////////////////

function exit_room(room) {
  console.log(room.id);
  pause_update();

  let fd = new FormData();
  fd.append('pname', 'exit_room');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room.id);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
    }
    else {
      console.log(resp);
      show_message("");
    }
    continue_update();
  }

  call_function_with_formData(inner_function, fd);
}

///////////////////////////////////////////////////ADD ROOM///////////////////////////////////////////////////

const modal = document.getElementById("myModal");
const btn = document.getElementById("add-room");
const span = document.querySelector(".exit-modal");

btn.onclick = function () {
  modal.style.display = "block";
}

span.onclick = function () {
  modal.style.display = "none";
}

window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

document.getElementById("finish-and-add").addEventListener("click", function () {
  pause_update();

  const psw_new_room = document.getElementById("new-room-password").value;
  const time_new_room = document.getElementById("new-room-time").value;
  const dif_new_room = document.getElementById("dif-select").value;

  let fd = new FormData();
  fd.append('pname', 'new_room');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', psw_new_room);
  fd.append('p3', time_new_room);
  fd.append('p4', dif_new_room);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
    }
    else {
      show_message("");
    }
    continue_update();
    modal.style.display = "none";
  }

  call_function_with_formData(inner_function, fd);
});


///////////////////////////////////////////////////TO GAME///////////////////////////////////////////////////

function toGame(room) {
  pause_update();
  this.sessionStorage.setItem("room", room.id);
  window.location.href = "game/index.html";
}

///////////////////////////////////////////////////START GAME///////////////////////////////////////////////////

function startGame(room) {
  pause_update();
  let fd = new FormData();
  fd.append('pname', 'start_game');
  fd.append('db', '284196');
  fd.append('p1', tk);
  fd.append('p2', room.id);
  fd.append('format', 'columns_compact');

  const inner_function = function (resp) {
    if (resp.RESULTS[0].error) {
      show_message(resp.RESULTS[0].rus_error[0]);
      continue_update();
    }
    else {
      show_message("");
      this.sessionStorage.setItem("room", room.id);
      window.location.href = "game/index.html";
    }
  }
  call_function_with_formData(inner_function, fd);
}


window.addEventListener("load", function () {
  try {
    login = this.sessionStorage.getItem("login");
    tk = this.sessionStorage.getItem("tk");
    if (tk)
      update_info(true);
  }
  catch {
    console.log("Menu start error");
  }
});


const server_url = 'https://sql.lavro.ru/call.php';

function startMenu() {
  const hidden_room = document.querySelector("#hidden_room");
  const rooms_container = hidden_room.parentElement;
  let timeOutInterval;
  let rooms = [];

  class Room {
    constructor(id, admin, dif, time, hasPassw, playersInRoom, gameStarted, prev) {
      this.id = id;
      this.admin = admin;
      this.dif = dif;
      this.time = time;
      this.hasPassw = hasPassw;
      this.playersInRoom = playersInRoom;
      this.gameStarted = gameStarted;
      this.createRoom(prev);
    }

    createRoom(prevEl = document.querySelector("#hidden_room")) {
      const newEl = hidden_room.cloneNode(true);
      newEl.setAttribute("id", `${this.id}`);
      newEl.querySelector(".room-value-id").textContent = `${this.id}`;
      newEl.querySelector(".room-value-admin").textContent = `${this.admin}`;
      newEl.querySelector(".room-value-dif").textContent = `${this.dif}`;
      newEl.querySelector(".room-value-time").textContent = `${this.time}`;
      newEl.querySelector(".room-value-players").textContent = `${this.gameStarted ? "Игра начата" : this.playersInRoom}`;
      const psw_field = newEl.querySelector(".room-value-psw");
      if (this.hasPassw) {
        psw_field.querySelector(".no-room-psw").style.display = "none";
      }
      else {
        psw_field.querySelector(".room-password").style.display = "none";
      }
      const join_field = newEl.querySelector(".room-value-join");
      if (this.gameStarted) {
        join_field.querySelector(".room-enter-button").style.display = "none";
      }
      else {
        join_field.querySelector(".game-started").style.display = "none";
      }
      newEl.querySelector(".room-value-players").textContent = `${this.gameStarted ? "Игра начата" : this.playersInRoom}`;
      this.element = newEl;
      rooms_container.insertBefore(this.element, prevEl.nextSibling);
    }

    updateRoom(admin, game_started, players_in_room) {
      this.admin = admin;
      this.gameStarted = game_started;
      this.playersInRoom = players_in_room;
      this.element.querySelector(".room-value-admin").textContent = `${this.admin}`;
      const join_field = this.element.querySelector(".room-value-join");
      if (this.gameStarted) {
        join_field.querySelector(".room-enter-button").style.display = "none";
        join_field.querySelector(".game-started").style.display = "block";
      }
      else {
        join_field.querySelector(".room-enter-button").style.display = "inline-block";
        join_field.querySelector(".game-started").style.display = "none";
      }
      this.element.querySelector(".room-value-players").textContent = `${this.gameStarted ? "Игра начата" : this.playersInRoom}`;
    }
    deleteRoom() {
      rooms_container.removeChild(this.element);
    }
  }

  function show_message(s) {
    document.querySelector("#message").textContent = s;
  }

  document.getElementById("login_button").onclick = function (event) {
    let login = document.getElementById("user_login").value;
    let psw = document.getElementById("user_password").value;

    let fd = new FormData();
    fd.append('pname', 'sign_in');
    fd.append('db', '284196');
    fd.append('p1', login);
    fd.append('p2', psw);
    fd.append('format', 'columns_compact');

    function prepare_game(resp) {
      if (resp.RESULTS[0].error) {
        show_message(resp.RESULTS[0].rus_error[0]);
      }
      else {
        window.user_login = login;
        window.tk = resp.RESULTS[0].token;
        document.querySelector(".room_container").style.display = "block";
        document.querySelector(".in_room_container").style.display = "flex";
        document.querySelector(".login_container").style.display = "none";
        const log_label = document.querySelector("#login_label");
        log_label.style.display = "inline-block";
        log_label.textContent += login;
        update_info();
      }
    }
    call_function_with_formData(prepare_game, fd);
  }

  document.getElementById("reg_button").onclick = function (event) {
    let login = document.getElementById("user_login").value;
    let psw = document.getElementById("user_password").value;

    let fd = new FormData();
    fd.append('pname', 'reg_new_user');
    fd.append('db', '284196');
    fd.append('p1', login);
    fd.append('p2', psw);
    fd.append('format', 'columns_compact');

    function prepare_game(resp) {
      if (resp.RESULTS[0].error) {
        show_message(resp.RESULTS[0].rus_error[0]);
      }
      else {
        window.user_login = login;
        window.tk = resp.RESULTS[0].token;
        document.querySelector(".room_container").style.display = "block";
        document.querySelector(".in_room_container").style.display = "flex";
        document.querySelector(".login_container").style.display = "none";
        const log_label = document.querySelector("#login_label");
        log_label.style.display = "inline-block";
        log_label.textContent += login;
        update_info();
      }
    }
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
  }

  ///////////////////////////////////////////////////UPDATE INFO///////////////////////////////////////////////////

  function update_info() {
    let fd = new FormData();
    fd.append('pname', 'update_info');
    fd.append('db', '284196');
    fd.append('p1', tk);
    fd.append('format', 'columns_compact');

    const inner_function = function (resp) {
      if (resp.RESULTS[0].error) {
        show_message(resp.RESULTS[0].rus_error[0]);
      }
      else {
        const rooms_resp = resp.RESULTS[2];
        let i;
        for (i = 0; i < rooms_resp.id.length; i++) {
          if (!rooms[i]) {
            rooms.push(new Room(
              rooms_resp.id[i],
              rooms_resp.admin[i],
              rooms_resp.difficulty[i],
              rooms_resp.turn_time[i],
              rooms_resp.has_password[i] === 1,
              rooms_resp.players_in_room[i],
              rooms_resp.game_started[i] === 1,
              rooms[i - 1]
            ));
          }
          else if (rooms[i].id < rooms_resp.id[i]) {
            rooms[i].deleteRoom();
            rooms = [...rooms.slice(0, i), ...rooms.slice(i + 1, rooms.length)];
            i--;
          }
          else if (rooms[i].id > rooms_resp.id[i]) {
            rooms.splice(i, 0, new Room(
              rooms_resp.id[i],
              rooms_resp.admin[i],
              rooms_resp.difficulty[i],
              rooms_resp.turn_time[i],
              rooms_resp.has_password[i] === 1,
              rooms_resp.players_in_room[i],
              rooms_resp.game_started[i] === 1,
              rooms[i - 1]
            ));
          }
          else {
            rooms[i].updateRoom(rooms_resp.admin[i], rooms_resp.game_started[i] === 1, rooms_resp.players_in_room[i]);
          }
        }
        for (let j = rooms_resp.id.length; j < rooms.length; j++) {
          rooms[j].deleteRoom();
        }
        rooms = rooms.slice(0, i);
      }
      console.log(rooms);
    }

    call_function_with_formData(inner_function, fd);

    timeOutInterval = setTimeout(update_info, 5000);
  }

  ///////////////////////////////////////////////////TEST///////////////////////////////////////////////////

  document.getElementById("test").addEventListener("click", function () {
    window.location.href = "game/index.html";
    window.startGame();
  });
}

window.startMenu = startMenu;

try {
  startMenu();
}
catch {
  console.log("Menu start error");
}
const localstorage_available = typeof (Storage) !== "undefined";

var app,
	client = new WebTorrent(),
	simplemde,
	encryped_content;

let localtracker = "ws://toss.rebuildearth.org"
let peerUrl = "http://toss2.rebuildearth.org/peers"

function get_info_hash_from_url() {
	hash_value = window.location.hash;
	return hash_value.slice(1, 41);
}

function get_key_from_url() {
	hash_value = window.location.hash;
	return hash_value.slice(41);
}

var magnet_link;

function update_magnet_link() {
	info_hash = get_info_hash_from_url();
	if (info_hash) {
		var template_magnet_link = "magnet:?xt=urn:btih:{{INFO_HASH}}&dn=inetd.c&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com";
		magnet_link = template_magnet_link.replace("{{INFO_HASH}}", info_hash)
	}
}

function is_published() {
	return window.location.hash.length >= 32;
}

function get_local_decrypted_content() {
	if (is_published()) {
		if (localstorage_available) {
			const info_hash = get_info_hash_from_url();
			encryped_content = localStorage.getItem(info_hash);
			if (encryped_content) {
				decrypted = CryptoJS.AES.decrypt(encryped_content, get_key_from_url());
				return decrypted.toString(CryptoJS.enc.Utf8)
			}
		}
	}
}


function get_local_encrypted_content() {
	if (is_published()) {
		if (localstorage_available) {
			const info_hash = get_info_hash_from_url();
			encryped_content = localStorage.getItem(info_hash);
			return encryped_content;
		}
	}
}

function peer_info_updater(torrent) {
	$('#peer-count').text(torrent.numPeers);
	var interval = setInterval(function () {
		$('#peer-count').text(torrent.numPeers);
	}, 4000)
};

function update_heart(class_name) {
	var heart_div_parent = document.getElementById("heart-parent");
	while (heart_div_parent.hasChildNodes()) {
		heart_div_parent.removeChild(heart_div_parent.lastChild);
	}
	var heart_div = document.createElement("div");
	heart_div.className = class_name;
	heart_div_parent.appendChild(heart_div);
}

function save_doc() {
	if (localstorage_available) {
		localStorage.setItem(get_info_hash_from_url(), encryped_content);
	}
}

function remove_doc() {
	if (localstorage_available) {
		localStorage.removeItem(get_info_hash_from_url());
	}
}

function get_random_key() {
	var text = "";
	var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
	
	for (var i = 0; i < 15; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	
	return "aaabbbcccddd";
}

function show_smsg(msg, persistent) {
	$("#smsg").text(msg);
	$(".toast").toast("show");
}

function show_post(obj) {
	$('.section').hide();
	$('#post-section').show().find("article").html(marked(obj.content));
	$('#post-title').html(obj.name);
	$('#post-time').html(obj.time);
}

function show_editor(obj) {
	$('.section').hide();
	$('#edit-section').show();
}

function show_popular() {
	$('.section').hide();
	$('#popular-section').show();
	// $('#popular-section').html("testkhdsfkjhdsjk");
	$.get(peerUrl, function(data){
		htmldata = ''
		let key = get_random_key();
		Object.keys(data).forEach(function(d){
			htmldata += '<a href=\"/toss/#'+ d + key + '\">Peer count:'+ data[d]  + '</a><br>'
		})
		$('#popular-section').html(htmldata)
	})
}

function show_about() {
	$('.section').hide();
	$('#about-section').show();
}

function router() {
	var hash = location.hash;
	if (is_published()) {
		const local_content = get_local_decrypted_content();
			
		if (local_content) {
			var object = JSON.parse(local_content);
			show_smsg("Loading from local storage...");

			// show content
			show_post(object);

			var encrypted_string = get_local_encrypted_content();
			var f = new File([encrypted_string], "a");

			client.seed(f, {
				announce: [localtracker]
			}, function (torrent) {
				peer_info_updater(torrent);
			});
		} else {
			var json_file;
			if (magnet_link) {
				show_smsg("Loading from peers...");
				client.add(magnet_link, {
					announce: [localtracker]
				}, function (torrent) {
					torrent.files.forEach(function (file) {
						var reader = new FileReader();
						reader.addEventListener("loadend", function () {
							encryped_content = reader.result;
							var decrypted_content = CryptoJS.AES.decrypt(reader.result, get_key_from_url());
							var object = JSON.parse(decrypted_content.toString(CryptoJS.enc.Utf8));
							show_post(object);
						});
		
						file.getBlob(function (err, blob) {
							reader.readAsText(blob);
						});

						var interval = setInterval(function () {
							$('#peer-count').text(torrent.numPeers);
						}, 2000)
					})
				});
			}
		}
	} else if (hash == '#!/' || hash == '') {
		show_editor();
	} else if (hash == '#!/popular') {
		show_popular();
	} else if (hash == '#!/about') {
		show_about();
	}
}

app = new Vue({
	el: "#app",
	data: {
		show_post_button: true,
		class_name: "",
		post_content: "",
	},
	methods: {
		post_document: function() {
			var content = {
				name: document.getElementById('blog-postname').value,
				content: simplemde.value(),
				time: new Date().toDateString()
			};
			var stringified_content = JSON.stringify(content);
			var key = get_random_key();
			var encrypted_string = CryptoJS.AES.encrypt(stringified_content, key);

			var f = new File([encrypted_string], "a");
			client.seed(f, {
				announce: [localtracker]
			}, function (torrent) {
				const new_info_hash = torrent.infoHash;
				var url = new_info_hash + key;
				window.location.hash = url;
				encryped_content = encrypted_string;
				save_doc();
				show_post(content);
				peer_info_updater(torrent);
			})
		},
		toogle_heart: function() {
			if (app.class_name === "fas fa-heart") {
				app.class_name = "far fa-heart";
				update_heart(app.class_name);
				remove_doc();
			} else {
				app.class_name = "fas fa-heart";
				update_heart(app.class_name);
				save_doc();
			}
		}
	},
	computed: {
		compiledMarkdown: function (content) {
			return marked(this.post_content, { sanitize: true })
		}
	},
	mounted() {
		main = function() {
			simplemde = new SimpleMDE({
				element: document.getElementById("editor"),
				placeholder: "Write something :)",
				autofocus: true,
			});
		};
		main();

		update_magnet_link();
		router();

		$(window).on('hashchange', function() {
			update_magnet_link();
			router();
		});
	},
});

// Curated emoji set (no external dependency). Each entry: [emoji, shortcode, ...keywords].

export const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "😀",
    emojis: [
      ["😀", "grinning", "happy", "smile"], ["😃", "smiley", "happy"], ["😄", "smile", "happy", "joy"], ["😁", "grin"],
      ["😆", "laughing", "lol"], ["😅", "sweat_smile", "phew"], ["🤣", "rofl", "lol"], ["😂", "joy", "lol", "tears"],
      ["🙂", "slightly_smiling_face"], ["🙃", "upside_down_face"], ["😉", "wink"], ["😊", "blush"],
      ["😇", "innocent", "angel"], ["🥰", "smiling_face_with_hearts", "love"], ["😍", "heart_eyes", "love"], ["🤩", "star_struck", "wow"],
      ["😘", "kissing_heart"], ["😋", "yum"], ["😛", "stuck_out_tongue"], ["😜", "stuck_out_tongue_winking_eye"],
      ["🤪", "zany_face", "crazy"], ["🤑", "money_mouth_face"], ["🤗", "hugs", "hug"], ["🤭", "hand_over_mouth"],
      ["🤫", "shushing_face", "quiet"], ["🤔", "thinking", "hmm"], ["🤐", "zipper_mouth_face"], ["🤨", "raised_eyebrow"],
      ["😐", "neutral_face"], ["😑", "expressionless"], ["😶", "no_mouth"], ["😏", "smirk"],
      ["😒", "unamused"], ["🙄", "roll_eyes"], ["😬", "grimacing"], ["😌", "relieved"],
      ["😔", "pensive"], ["😪", "sleepy"], ["😴", "sleeping", "zzz"], ["😷", "mask", "sick"],
      ["🤒", "face_with_thermometer", "sick"], ["🤕", "face_with_head_bandage"], ["🤢", "nauseated_face"], ["🤧", "sneezing_face"],
      ["🥵", "hot_face"], ["🥶", "cold_face"], ["🥴", "woozy_face"], ["😵", "dizzy_face"],
      ["🤯", "exploding_head", "mind_blown"], ["🤠", "cowboy_hat_face"], ["🥳", "partying_face", "party"], ["😎", "sunglasses", "cool"],
      ["🤓", "nerd_face"], ["🧐", "monocle_face"], ["😕", "confused"], ["😟", "worried"],
      ["🙁", "slightly_frowning_face"], ["😮", "open_mouth", "wow"], ["😲", "astonished"], ["😳", "flushed"],
      ["🥺", "pleading_face"], ["😦", "frowning"], ["😨", "fearful"], ["😰", "cold_sweat"],
      ["😢", "cry", "sad"], ["😭", "sob", "sad"], ["😱", "scream"], ["😖", "confounded"],
      ["😞", "disappointed"], ["😓", "sweat"], ["😩", "weary"], ["😫", "tired_face"],
      ["🥱", "yawning_face"], ["😤", "triumph"], ["😡", "rage", "angry"], ["😠", "angry"],
      ["🤬", "cursing_face"], ["😈", "smiling_imp"], ["💀", "skull"], ["💩", "poop"],
      ["🤡", "clown_face"], ["👻", "ghost"], ["👽", "alien"], ["🤖", "robot"],
    ],
  },
  {
    id: "people",
    label: "People",
    icon: "👋",
    emojis: [
      ["👋", "wave", "hello", "hi"], ["🤚", "raised_back_of_hand"], ["✋", "raised_hand", "hand"], ["🖖", "vulcan_salute"],
      ["👌", "ok_hand", "ok"], ["🤌", "pinched_fingers"], ["✌️", "v", "peace"], ["🤞", "crossed_fingers", "luck"],
      ["🤟", "love_you_gesture"], ["🤘", "metal"], ["🤙", "call_me_hand"], ["👈", "point_left"],
      ["👉", "point_right"], ["👆", "point_up_2"], ["👇", "point_down"], ["☝️", "point_up"],
      ["👍", "+1", "thumbsup", "yes", "like"], ["👎", "-1", "thumbsdown", "no"], ["✊", "fist"], ["👊", "punch"],
      ["👏", "clap", "applause"], ["🙌", "raised_hands", "hooray"], ["👐", "open_hands"], ["🤲", "palms_up_together"],
      ["🤝", "handshake", "deal"], ["🙏", "pray", "thanks", "please"], ["✍️", "writing_hand"], ["💪", "muscle", "strong"],
      ["🧠", "brain"], ["👀", "eyes", "look"], ["👁️", "eye"], ["👶", "baby"],
      ["🧑‍💻", "technologist", "developer", "coder"], ["👩‍💻", "woman_technologist"], ["👨‍💻", "man_technologist"], ["🧑‍🎨", "artist"],
      ["🧑‍🔧", "mechanic"], ["🧑‍🏫", "teacher"], ["🕵️", "detective"], ["🦸", "superhero"],
      ["🙋", "raising_hand"], ["🤷", "shrug"], ["🤦", "facepalm"], ["🙇", "bow"],
      ["💁", "tipping_hand_person"], ["🙅", "no_good"], ["🙆", "ok_person"], ["🏃", "runner", "running"],
    ],
  },
  {
    id: "nature",
    label: "Nature",
    icon: "🌿",
    emojis: [
      ["🐶", "dog"], ["🐱", "cat"], ["🐭", "mouse"], ["🦊", "fox_face", "fox"], ["🐻", "bear"], ["🐼", "panda_face"],
      ["🐨", "koala"], ["🐯", "tiger"], ["🦁", "lion"], ["🐮", "cow"], ["🐷", "pig"], ["🐸", "frog"],
      ["🐵", "monkey_face"], ["🙈", "see_no_evil"], ["🙉", "hear_no_evil"], ["🙊", "speak_no_evil"],
      ["🐔", "chicken"], ["🐧", "penguin"], ["🐦", "bird"], ["🦄", "unicorn"], ["🐝", "bee"], ["🐛", "bug"],
      ["🦋", "butterfly"], ["🐢", "turtle", "slow"], ["🐍", "snake"], ["🐙", "octopus"], ["🐳", "whale"], ["🐬", "dolphin"],
      ["🌵", "cactus"], ["🌲", "evergreen_tree"], ["🌳", "deciduous_tree"], ["🌴", "palm_tree", "vacation"], ["🌱", "seedling"], ["🌿", "herb"],
      ["🍀", "four_leaf_clover", "luck"], ["🍁", "maple_leaf"], ["🌸", "cherry_blossom"], ["🌹", "rose"], ["🌻", "sunflower"], ["🌈", "rainbow"],
      ["☀️", "sunny", "sun"], ["⛅", "partly_sunny"], ["🌧️", "cloud_with_rain", "rain"], ["⛈️", "cloud_with_lightning_and_rain"], ["❄️", "snowflake"], ["🔥", "fire", "lit", "hot"],
      ["💧", "droplet"], ["🌊", "ocean", "wave_water"], ["🌙", "crescent_moon"], ["⭐", "star"], ["🌟", "star2", "glowing_star"], ["⚡", "zap", "lightning"],
    ],
  },
  {
    id: "food",
    label: "Food",
    icon: "🍕",
    emojis: [
      ["🍏", "green_apple"], ["🍎", "apple"], ["🍊", "tangerine"], ["🍋", "lemon"], ["🍌", "banana"], ["🍉", "watermelon"],
      ["🍇", "grapes"], ["🍓", "strawberry"], ["🍒", "cherries"], ["🍑", "peach"], ["🥑", "avocado"], ["🌶️", "hot_pepper"],
      ["🥐", "croissant"], ["🥯", "bagel"], ["🍞", "bread"], ["🧀", "cheese"], ["🍳", "fried_egg"], ["🥓", "bacon"],
      ["🍔", "hamburger", "burger"], ["🍟", "fries"], ["🍕", "pizza"], ["🌮", "taco"], ["🌯", "burrito"], ["🥗", "salad"],
      ["🍝", "spaghetti"], ["🍜", "ramen"], ["🍣", "sushi"], ["🍩", "doughnut"], ["🍪", "cookie"], ["🎂", "birthday", "cake"],
      ["🍰", "cake_slice"], ["🧁", "cupcake"], ["🍫", "chocolate_bar"], ["🍿", "popcorn"], ["☕", "coffee"], ["🍵", "tea"],
      ["🧃", "beverage_box"], ["🥤", "cup_with_straw"], ["🍺", "beer"], ["🍻", "beers", "cheers"], ["🥂", "clinking_glasses", "toast"], ["🍷", "wine_glass"],
    ],
  },
  {
    id: "activities",
    label: "Activities",
    icon: "⚽",
    emojis: [
      ["⚽", "soccer", "football"], ["🏀", "basketball"], ["🏈", "american_football"], ["⚾", "baseball"], ["🎾", "tennis"], ["🏐", "volleyball"],
      ["🏓", "ping_pong"], ["🏸", "badminton"], ["🥅", "goal_net"], ["⛳", "golf"], ["🏹", "bow_and_arrow"], ["🎣", "fishing_pole_and_fish"],
      ["🥊", "boxing_glove"], ["🏆", "trophy", "win"], ["🥇", "1st_place_medal", "gold"], ["🥈", "2nd_place_medal"], ["🥉", "3rd_place_medal"], ["🏅", "medal_sports"],
      ["🎯", "dart", "target", "bullseye"], ["🎮", "video_game"], ["🎲", "game_die"], ["🧩", "jigsaw", "puzzle"], ["🎨", "art"], ["🎬", "clapper"],
      ["🎤", "microphone"], ["🎧", "headphones"], ["🎵", "musical_note"], ["🎸", "guitar"], ["🎉", "tada", "party", "celebrate"], ["🎊", "confetti_ball"],
      ["🎈", "balloon"], ["🎁", "gift"], ["🎟️", "tickets"], ["🪄", "magic_wand"],
    ],
  },
  {
    id: "travel",
    label: "Travel",
    icon: "🚀",
    emojis: [
      ["🚗", "car"], ["🚕", "taxi"], ["🚌", "bus"], ["🚑", "ambulance"], ["🚒", "fire_engine"], ["🚓", "police_car"],
      ["🚲", "bike"], ["🛴", "kick_scooter"], ["🚂", "steam_locomotive"], ["🚆", "train"], ["✈️", "airplane"], ["🚀", "rocket", "launch", "ship"],
      ["🛸", "flying_saucer"], ["🚁", "helicopter"], ["⛵", "boat"], ["🚢", "ship_boat"], ["⚓", "anchor"], ["🚧", "construction", "wip"],
      ["🗺️", "world_map"], ["🗽", "statue_of_liberty"], ["🏰", "castle"], ["🏠", "house", "home"], ["🏡", "house_with_garden", "remote"], ["🏢", "office", "building"],
      ["🏖️", "beach_umbrella", "beach"], ["🏔️", "mountain_snow"], ["🌋", "volcano"], ["🌍", "earth_africa", "world"], ["🌎", "earth_americas"], ["🌏", "earth_asia"],
    ],
  },
  {
    id: "objects",
    label: "Objects",
    icon: "💡",
    emojis: [
      ["⌚", "watch"], ["📱", "iphone", "phone"], ["💻", "computer", "laptop"], ["⌨️", "keyboard"], ["🖥️", "desktop_computer"], ["🖱️", "computer_mouse"],
      ["💾", "floppy_disk", "save"], ["💿", "cd"], ["📷", "camera"], ["🎥", "movie_camera"], ["📞", "telephone_receiver"], ["📺", "tv"],
      ["⏰", "alarm_clock"], ["⏳", "hourglass_flowing_sand", "waiting"], ["⌛", "hourglass"], ["💡", "bulb", "idea"], ["🔦", "flashlight"], ["🕯️", "candle"],
      ["💸", "money_with_wings"], ["💰", "moneybag"], ["💳", "credit_card"], ["💎", "gem"], ["⚖️", "balance_scale"], ["🔧", "wrench", "fix"],
      ["🔨", "hammer"], ["🛠️", "hammer_and_wrench", "tools"], ["⚙️", "gear", "settings"], ["🧰", "toolbox"], ["🔩", "nut_and_bolt"], ["🧪", "test_tube", "test"],
      ["🔬", "microscope"], ["🔭", "telescope"], ["📡", "satellite"], ["💉", "syringe"], ["💊", "pill"], ["🔑", "key"],
      ["🔒", "lock"], ["🔓", "unlock"], ["📦", "package", "box", "release"], ["📫", "mailbox"], ["📧", "email", "e-mail"], ["📨", "incoming_envelope"],
      ["📝", "memo", "note"], ["📄", "page_facing_up", "document"], ["📊", "bar_chart", "chart"], ["📈", "chart_with_upwards_trend", "growth"], ["📉", "chart_with_downwards_trend"], ["📅", "date", "calendar"],
      ["📌", "pushpin", "pin"], ["📎", "paperclip", "attachment"], ["✂️", "scissors"], ["🗂️", "card_index_dividers"], ["🗑️", "wastebasket", "trash"], ["🔖", "bookmark"],
      ["📚", "books"], ["📖", "book"], ["🔗", "link"], ["🧲", "magnet"], ["🪲", "beetle", "bug_report"], ["🧯", "fire_extinguisher", "hotfix"],
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: "❤️",
    emojis: [
      ["❤️", "heart", "love"], ["🧡", "orange_heart"], ["💛", "yellow_heart"], ["💚", "green_heart"], ["💙", "blue_heart"], ["💜", "purple_heart"],
      ["🖤", "black_heart"], ["🤍", "white_heart"], ["💔", "broken_heart"], ["❣️", "heavy_heart_exclamation"], ["💕", "two_hearts"], ["💯", "100", "hundred", "perfect"],
      ["✅", "white_check_mark", "done", "check"], ["☑️", "ballot_box_with_check"], ["✔️", "heavy_check_mark"], ["❌", "x", "no", "cross"], ["❎", "negative_squared_cross_mark"], ["➕", "heavy_plus_sign", "plus"],
      ["➖", "heavy_minus_sign"], ["❓", "question"], ["❗", "exclamation", "important"], ["‼️", "bangbang"], ["⚠️", "warning"], ["🚫", "no_entry_sign", "forbidden"],
      ["⛔", "no_entry", "blocked"], ["🔴", "red_circle"], ["🟠", "orange_circle"], ["🟡", "yellow_circle"], ["🟢", "green_circle"], ["🔵", "large_blue_circle", "blue_circle"],
      ["🟣", "purple_circle"], ["⚫", "black_circle"], ["⚪", "white_circle"], ["🔺", "small_red_triangle"], ["🔻", "small_red_triangle_down"], ["💬", "speech_balloon", "comment"],
      ["💭", "thought_balloon"], ["🗯️", "right_anger_bubble"], ["♻️", "recycle"], ["🆗", "ok_button"], ["🆕", "new"], ["🆒", "cool_button"],
      ["🔝", "top"], ["🔜", "soon"], ["⏩", "fast_forward"], ["⏪", "rewind"], ["▶️", "arrow_forward", "play"], ["⏸️", "pause_button"],
      ["🔁", "repeat"], ["🔀", "twisted_rightwards_arrows", "shuffle"], ["⬆️", "arrow_up"], ["⬇️", "arrow_down"], ["➡️", "arrow_right"], ["⬅️", "arrow_left"],
      ["🔔", "bell"], ["🔕", "no_bell"], ["📣", "mega", "announcement"], ["📢", "loudspeaker"], ["🏁", "checkered_flag", "finish"], ["🚩", "triangular_flag_on_post", "flag"],
    ],
  },
];

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "👀", "✅"];

const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((category) => category.emojis.map(([emoji, name, ...keywords]) => ({
  emoji,
  name,
  keywords,
  category: category.id,
})));

const BY_SHORTCODE = new Map();
ALL_EMOJIS.forEach((entry) => {
  if (!BY_SHORTCODE.has(entry.name)) BY_SHORTCODE.set(entry.name, entry.emoji);
});
// Common aliases people type out of habit.
[["thumbsup", "👍"], ["thumbsdown", "👎"], ["heart", "❤️"], ["fire", "🔥"], ["ok", "👌"], ["shipit", "🚀"], ["check", "✅"], ["lgtm", "👍"]]
  .forEach(([name, emoji]) => { if (!BY_SHORTCODE.has(name)) BY_SHORTCODE.set(name, emoji); });

const NAME_BY_EMOJI = new Map();
ALL_EMOJIS.forEach((entry) => { if (!NAME_BY_EMOJI.has(entry.emoji)) NAME_BY_EMOJI.set(entry.emoji, entry.name); });

export function getAllEmojis() {
  return ALL_EMOJIS;
}

export function getEmojiName(emoji) {
  return NAME_BY_EMOJI.get(emoji) || "";
}

export function emojiForShortcode(name) {
  return BY_SHORTCODE.get(String(name || "").toLowerCase()) || null;
}

/** `:tada:` → 🎉 for known shortcodes; unknown ones stay as typed. */
export function replaceShortcodes(text) {
  return String(text || "").replace(/:([a-z0-9_+-]{1,40}):/gi, (match, name) => emojiForShortcode(name) || match);
}

export function searchEmojis(query, max = 48) {
  const needle = String(query || "").trim().toLowerCase().replace(/^:/, "");
  if (!needle) return ALL_EMOJIS.slice(0, max);
  const starts = [];
  const contains = [];
  ALL_EMOJIS.forEach((entry) => {
    const names = [entry.name, ...entry.keywords];
    if (names.some((name) => name.startsWith(needle))) starts.push(entry);
    else if (names.some((name) => name.includes(needle))) contains.push(entry);
  });
  return [...starts, ...contains].slice(0, max);
}

/**
 * Reaction map keys must be safe Firestore field names, so reactions are
 * keyed by the emoji's code points ("1f44d") instead of the emoji itself.
 */
export const CUSTOM_EMOJI_NAME = /^[a-z0-9_+-]{2,32}$/;
const CUSTOM_SHORTCODE = /^:([a-z0-9_+-]{2,32}):$/;

/** `:party-parrot:` → "party-parrot" when the value is a lone shortcode, else null. */
export function customShortcodeName(value) {
  const match = String(value || "").match(CUSTOM_SHORTCODE);
  return match ? match[1] : null;
}

export function reactionKey(emoji) {
  const custom = customShortcodeName(emoji);
  if (custom && !emojiForShortcode(custom)) return `c_${custom}`;
  return [...String(emoji || "")]
    .map((char) => char.codePointAt(0).toString(16))
    .filter((code) => code !== "fe0f")
    .join("-");
}

export function emojiFromReactionKey(key) {
  if (String(key || "").startsWith("c_")) return `:${String(key).slice(2)}:`;
  try {
    const points = String(key || "").split("-").filter(Boolean).map((code) => parseInt(code, 16));
    if (!points.length || points.some((point) => Number.isNaN(point))) return "";
    const raw = String.fromCodePoint(...points);
    // Restore the emoji presentation selector for symbols that need it (❤️, ✅…).
    return points.length === 1 && !/\p{Emoji_Presentation}/u.test(raw) ? `${raw}️` : raw;
  } catch {
    return "";
  }
}

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u;

/** True when the message is 1–3 emoji and nothing else (rendered large). */
export function isJumboEmoji(text) {
  const value = String(text || "").trim();
  if (!value || value.length > 24 || /\d/.test(value) || !EMOJI_ONLY.test(value)) return false;
  const count = [...value.matchAll(/\p{Extended_Pictographic}/gu)].length;
  return count > 0 && count <= 3;
}

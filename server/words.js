// server/words.js

const categories = {
    "Fruits 🍎": [
      "Apple", "Banana", "Orange", "Strawberry", "Blueberry", "Grapes", "Watermelon", "Pineapple", "Mango", "Peach",
      "Pear", "Cherry", "Plum", "Kiwi", "Lemon", "Lime", "Grapefruit", "Raspberry", "Blackberry", "Cantaloupe",
      "Honeydew", "Pomegranate", "Fig", "Coconut", "Avocado", "Papaya", "Guava", "Passionfruit", "Apricot", "Nectarine"
    ],
    "Animals (Common) 🐘": [
      "Dog", "Cat", "Elephant", "Lion", "Tiger", "Bear", "Monkey", "Horse", "Zebra", "Giraffe",
      "Kangaroo", "Penguin", "Dolphin", "Owl", "Snake", "Cow", "Pig", "Sheep", "Goat", "Chicken",
      "Duck", "Rabbit", "Mouse", "Squirrel", "Deer", "Fox", "Wolf", "Fish", "Bird", "Frog"
    ],
    "Animals (Exotic) 🦜": [
      "Panda", "Koala", "Lemur", "Sloth", "Platypus", "Armadillo", "Chameleon", "Axolotl", "Capybara", "Okapi",
      "Tapir", "Red Panda", "Fennec Fox", "Komodo Dragon", "Toucan", "Macaw", "Meerkat", "Quokka", "Serval", "Snow Leopard"
    ],
    "Movies (Classics) 🎬": [
      "The Godfather", "Casablanca", "Citizen Kane", "Gone with the Wind", "Psycho", "2001: A Space Odyssey", "The Wizard of Oz", "Singin' in the Rain", "Pulp Fiction", "Forrest Gump",
      "Star Wars", "E.T.", "Jaws", "Back to the Future", "The Shawshank Redemption", "Titanic", "Jurassic Park", "The Lion King", "Schindler's List", "Goodfellas",
      "Blade Runner", "Alien", "The Shining", "Rocky", "Lawrence of Arabia", "Ben-Hur", "Doctor Zhivago", "Apocalypse Now", "Taxi Driver", "One Flew Over the Cuckoo's Nest"
    ],
    "Movies (Modern Blockbusters) 💥": [
      "Avengers: Endgame", "Avatar: The Way of Water", "Spider-Man: No Way Home", "Top Gun: Maverick", "Barbie", "Oppenheimer", "Black Panther", "Wonder Woman", "Guardians of the Galaxy", "The Dark Knight",
      "Inception", "Interstellar", "Mad Max: Fury Road", "John Wick", "Mission: Impossible", "Fast & Furious", "Deadpool", "Aquaman", "The Matrix", "Lord of the Rings",
      "Harry Potter", "Transformers", "Pirates of the Caribbean", "Hunger Games", "Twilight"
    ],
    "Household Objects 🛋️": [
      "Chair", "Table", "Sofa", "Lamp", "Television", "Refrigerator", "Microwave", "Bed", "Clock", "Vase",
      "Bookshelf", "Computer", "Telephone", "Toaster", "Blender", "Kettle", "Iron", "Vacuum Cleaner", "Mirror", "Rug",
      "Curtains", "Pillow", "Blanket", "Towel", "Mop", "Broom", "Trash Can", "Drawer", "Cabinet", "Desk"
    ],
    "Candy & Sweets 🍬": [
      "Chocolate Bar", "Gummy Bears", "Lollipop", "Sour Patch Kids", "Skittles", "M&Ms", "Snickers", "Twix", "Reese's Cups", "Kit Kat",
      "Jolly Rancher", "Starburst", "Nerds", "Candy Corn", "Pop Rocks", "Twizzlers", "Hershey's Kiss", "Milk Duds", "Swedish Fish", "Airheads",
      "Marshmallow", "Peppermint Patty", "Tootsie Roll", "Butterfinger", "Milky Way", "Cake", "Cookie", "Ice Cream", "Donut", "Cupcake"
    ],
    "Countries 🗺️": [
      "USA", "Canada", "Mexico", "Brazil", "Argentina", "Chile", "Peru", "Colombia", "Venezuela", "Cuba",
      "France", "Germany", "Italy", "Spain", "United Kingdom", "Ireland", "Portugal", "Greece", "Sweden", "Norway", "Finland",
      "Russia", "China", "Japan", "India", "South Korea", "Vietnam", "Thailand", "Australia", "New Zealand", "Egypt",
      "South Africa", "Nigeria", "Kenya", "Morocco", "Saudi Arabia", "Turkey", "Iran", "Israel", "Pakistan", "Indonesia"
    ],
    "Sports ⚽": [
      "Soccer", "Basketball", "Baseball", "Football (American)", "Tennis", "Golf", "Hockey", "Volleyball", "Swimming", "Boxing",
      "Cricket", "Rugby", "Skiing", "Cycling", "Running", "Track & Field", "Gymnastics", "Wrestling", "Martial Arts", "Formula 1",
      "NASCAR", "Surfing", "Skateboarding", "Snowboarding", "Archery", "Badminton", "Table Tennis", "Fencing", "Rowing", "Diving"
    ],
    "Occupations 🧑‍⚕️": [
       "Doctor", "Teacher", "Police Officer", "Firefighter", "Chef", "Engineer", "Artist", "Musician", "Writer", "Actor",
       "Nurse", "Lawyer", "Accountant", "Scientist", "Programmer", "Designer", "Architect", "Pilot", "Farmer", "Mechanic",
       "Electrician", "Plumber", "Carpenter", "Journalist", "Photographer", "Librarian", "Waiter/Waitress", "Cashier", "Barista", "Dentist"
    ],
    "TV Shows 📺": [
        "Breaking Bad", "Game of Thrones", "Friends", "The Office", "Stranger Things", "The Simpsons", "Seinfeld", "The Sopranos", "Squid Game", "Wednesday",
        "The Mandalorian", "Ted Lasso", "Succession", "The Crown", "Black Mirror", "Peaky Blinders", "Westworld", "Sherlock", "Doctor Who", "Star Trek",
        "Lost", "Grey's Anatomy", "House M.D.", "The Big Bang Theory", "How I Met Your Mother", "South Park", "Family Guy", "Rick and Morty", "Attack on Titan", "Naruto"
     ],
     "Musical Instruments 🎸": [
        "Guitar", "Piano", "Drums", "Violin", "Trumpet", "Saxophone", "Flute", "Cello", "Bass Guitar", "Keyboard",
        "Clarinet", "Trombone", "Ukulele", "Harp", "Accordion", "Bagpipes", "Xylophone", "Tambourine", "Triangle", "Harmonica",
        "Banjo", "Mandolin", "Didgeridoo", "Sitar", "Conga"
     ],
     "Mythical Creatures 🦄": [
        "Dragon", "Unicorn", "Griffin", "Phoenix", "Mermaid", "Centaur", "Fairy", "Goblin", "Elf", "Dwarf",
        "Kraken", "Hydra", "Cyclops", "Minotaur", "Pegasus", "Gorgon (Medusa)", "Sphinx", "Werewolf", "Vampire", "Zombie",
        "Banshee", "Leprechaun", "Yeti", "Sasquatch (Bigfoot)", "Chimera"
     ],
     "Famous Landmarks 🏛️": [
         "Eiffel Tower", "Statue of Liberty", "Great Wall of China", "Taj Mahal", "Colosseum", "Machu Picchu", "Pyramids of Giza", "Big Ben", "Sydney Opera House", "Christ the Redeemer",
         "Mount Rushmore", "Burj Khalifa", "Acropolis", "Stonehenge", "Petra", "Angkor Wat", "Niagara Falls", "Grand Canyon", "Neuschwanstein Castle", "Sagrada Familia",
         "St. Peter's Basilica", "Forbidden City", "Golden Gate Bridge", "Moai Statues (Easter Island)", "Kremlin"
      ]
  };
  
  // Export the categories object
  module.exports = categories;
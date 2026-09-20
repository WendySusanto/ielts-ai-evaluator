-- ---------------------------------------------------------------------------
-- Every IELTS Speaking prompt, Part 1 / 2 / 3. Single source of truth: this file replaces
-- the speaking block that used to live in seed.sql. Topics follow the real exam question
-- pool (Cambridge IELTS 10-19 style).
--
-- One idempotent upsert. Run it on a fresh database or on production — fixed UUIDs mean
-- every row either inserts or updates the row with that id in place, so re-running is safe
-- and brings existing rows up to the current wording (including the older prompts that had
-- no Cuepoints at all).
--   psql "$DATABASE_URL" -f seed-speaking-prompts.sql
--
-- What a re-run overwrites: the content columns below. Admin edits to those fields on these
-- seeded rows are lost. IsActive and IsDeleted are deliberately left alone, so a prompt an
-- admin switched off or deleted stays off.
--
-- Duration is in SECONDS. Part1 = 240, Part2 = 120 (after 1 min prep), Part3 = 300.
--
-- Part 1 and Part 3 store the examiner lead-in in QuestionText and the scripted
-- questions in Cuepoints, ONE PER LINE — the examiner asks them one at a time, as in the
-- real test. Part 2 keeps the cue card in QuestionText and its bullet points in Cuepoints.
-- ---------------------------------------------------------------------------

INSERT INTO "SpeakingPrompts" (
    "SpeakingPromptId", "Topic", "Description", "Preview", "Part",
    "QuestionText", "Cuepoints", "Duration", "Level", "IsActive", "IsDeleted"
) VALUES

-- --------------- Originally seeded by seed.sql ----------------------------
(
    '33333333-3333-4333-8333-000000000001',
    'Hometown',
    'Part 1 warm-up questions on a familiar topic. Answers should be two or three sentences, not one word and not a speech.',
    'Short everyday questions about where you come from and how it has changed.',
    'Part1',
    'Let us talk about your hometown.',
    'Where is your hometown, and what is it like?
Have you always lived there?
What do you like most about it?
Has it changed much in recent years?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000002',
    'Work and Study',
    'Part 1 questions on daily routine. Tests fluent, natural answers with light reasons and examples.',
    'Everyday questions about what you do, why you chose it, and what you would change.',
    'Part1',
    'Now let us talk about what you do.',
    'Do you work or are you a student?
Why did you choose that job or subject?
What do you enjoy most about it?
Is there anything you would like to change about it?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000003',
    'A Person Who Influenced You',
    'Part 2 cue card. One minute to prepare, then speak for one to two minutes covering all four bullet points.',
    'Describe someone who had an important influence on you and explain why.',
    'Part2',
    'Describe a person who has had an important influence on your life.

You should say:',
    'who this person is
how you know them
what kind of person they are
and explain why they have influenced you',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000004',
    'A Memorable Journey',
    'Part 2 cue card on past experience. Rewards consistent past tense and descriptive vocabulary.',
    'Describe a journey you remember well and say why it stayed with you.',
    'Part2',
    'Describe a journey that you remember well.

You should say:',
    'where you went
how you travelled
who you were with
and explain why you remember this journey',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000005',
    'A Skill You Would Like to Learn',
    'Part 2 cue card requiring future and conditional forms rather than narration.',
    'Describe a skill you want to learn and explain what is stopping you.',
    'Part2',
    'Describe a skill you would like to learn.

You should say:',
    'what the skill is
how you would learn it
how long it might take
and explain why you want to learn it',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000006',
    'Technology and Society',
    'Part 3 discussion. Abstract questions needing extended, speculative answers rather than personal anecdotes.',
    'Broader discussion about how technology is changing the way people live and work.',
    'Part3',
    'We have been talking about technology. I would like to discuss some more general questions.',
    'How has technology changed the way people communicate?
Do you think older people find it harder to adapt to new technology, and why?
Some say technology makes people less social. Would you agree?
What effect might artificial intelligence have on employment in the next twenty years?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000007',
    'Education and Learning',
    'Part 3 discussion on education policy. Tests comparison, opinion and speculation about the future.',
    'Broader discussion about schooling, exams and lifelong learning.',
    'Part3',
    'Let us consider education more generally.',
    'What do you think are the most important qualities of a good teacher?
Should schools focus more on academic subjects or practical skills?
How has the way people learn changed compared with a generation ago?
Do you think examinations are a fair way to measure ability?',
    300, 'Academic', true, false
),

-- ----------------------------- Part 1 --------------------------------------
(
    '33333333-3333-4333-8333-000000000008',
    'Your Home',
    'Part 1 questions about where you live. Answers should be two or three sentences with a reason or example.',
    'Everyday questions about your house or flat and what you would change about it.',
    'Part1',
    'Let us talk about where you live.',
    'Do you live in a house or an apartment?
Which room do you spend the most time in?
What do you like about your home?
Is there anything you would like to change about it?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000009',
    'Free Time',
    'Part 1 questions on leisure. Tests everyday vocabulary and natural frequency expressions.',
    'Short questions about how you spend your spare time and who you spend it with.',
    'Part1',
    'Now let us talk about your free time.',
    'What do you usually do in your free time?
Do you prefer spending free time alone or with other people?
Has the way you spend your free time changed in the last few years?
Do you think you have enough free time?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000000a',
    'Food and Cooking',
    'Part 1 questions about eating habits. Rewards descriptive food vocabulary and simple comparisons.',
    'Everyday questions about the food you eat, cooking and eating out.',
    'Part1',
    'Let us talk about food.',
    'What kind of food do you like most?
Do you prefer eating at home or eating out, and why?
Can you cook?
Have your eating habits changed since you were a child?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000000b',
    'Weather and Seasons',
    'Part 1 questions on weather. Tests likes and dislikes plus simple conditional forms.',
    'Short questions about the weather where you live and your favourite season.',
    'Part1',
    'I would like to ask about the weather.',
    'What is the weather usually like where you live?
Which season do you like best, and why?
Does the weather affect how you feel?
What do you usually do on a rainy day?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000000c',
    'Travel and Transport',
    'Part 1 questions about getting around. Tests frequency, preference and light reasoning.',
    'Everyday questions about how you travel and how you feel about public transport.',
    'Part1',
    'Let us talk about transport.',
    'How do you usually travel to work or school?
Do you often use public transport?
What is the traffic like in your area?
Would you prefer to drive or to be a passenger?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000000d',
    'Music',
    'Part 1 questions about listening habits. Tests past and present comparison.',
    'Short questions about the music you listen to and when you listen to it.',
    'Part1',
    'Now let us talk about music.',
    'What kind of music do you enjoy?
When do you usually listen to music?
Did you learn a musical instrument at school?
Has the music you like changed as you have got older?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000000e',
    'Reading',
    'Part 1 questions about books and reading. Tests habits, preferences and childhood memories.',
    'Everyday questions about what you read and whether you prefer paper or screens.',
    'Part1',
    'Let us talk about reading.',
    'Do you enjoy reading?
What kind of books or articles do you read?
Do you prefer reading on paper or on a screen, and why?
Did your parents read to you when you were a child?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000000f',
    'Shopping',
    'Part 1 questions about buying things. Tests preference, frequency and simple opinion.',
    'Short questions about how and where you like to shop.',
    'Part1',
    'I would like to ask about shopping.',
    'Do you enjoy shopping?
Do you prefer shopping online or in a shop, and why?
Who do you usually go shopping with?
How often do you buy clothes?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000010',
    'Friends',
    'Part 1 questions about friendship. Tests describing people and staying in touch.',
    'Everyday questions about your friends and how you keep in contact.',
    'Part1',
    'Let us talk about friends.',
    'Do you have a large group of friends or a few close ones?
How often do you see your friends?
How do you usually keep in touch with them?
What makes someone a good friend?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000011',
    'Daily Routine',
    'Part 1 questions on routine. Tests present simple, time expressions and preference.',
    'Short questions about how your typical day is organised.',
    'Part1',
    'Now let us talk about your daily routine.',
    'What does a typical day look like for you?
Are you a morning person or an evening person?
What part of the day do you enjoy most?
Would you like to change anything about your routine?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000012',
    'Mobile Phones',
    'Part 1 questions about phone use. Tests everyday technology vocabulary and mild opinion.',
    'Everyday questions about how you use your phone and whether you could live without it.',
    'Part1',
    'Let us talk about mobile phones.',
    'What do you mainly use your phone for?
How often do you check it during the day?
Was it easy for you to learn to use a smartphone?
Could you manage without your phone for a week?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000013',
    'Sport and Exercise',
    'Part 1 questions about physical activity. Tests frequency, past experience and preference.',
    'Short questions about the sport you play or watch and how you keep fit.',
    'Part1',
    'I would like to ask about sport.',
    'Do you play any sports?
Did you do much sport at school?
Do you prefer watching sport or taking part in it?
How do you usually keep fit?',
    240, 'Academic', true, false
),

-- ----------------------------- Part 2 --------------------------------------
(
    '33333333-3333-4333-8333-000000000014',
    'A Place You Like to Visit',
    'Part 2 cue card. One minute to prepare, then speak for one to two minutes covering all four bullet points.',
    'Describe a place you enjoy going to and explain what makes it special.',
    'Part2',
    'Describe a place you like to visit in your free time.

You should say:',
    'where this place is
how often you go there
what you do there
and explain why you like visiting this place',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000015',
    'A Book You Enjoyed',
    'Part 2 cue card on a past experience. Rewards narrative past tense and opinion language.',
    'Describe a book you read and enjoyed, and explain why it stayed with you.',
    'Part2',
    'Describe a book you have read that you enjoyed.

You should say:',
    'what the book was about
when and why you read it
what you liked about it
and explain whether you would recommend it to others',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000016',
    'An Important Decision',
    'Part 2 cue card requiring reflection. Tests past narration plus evaluation of consequences.',
    'Describe a decision you made that changed something for you.',
    'Part2',
    'Describe an important decision you have made.

You should say:',
    'what the decision was
when you made it
who or what helped you decide
and explain why this decision was important to you',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000017',
    'A Gift You Gave Someone',
    'Part 2 cue card on a personal event. Tests past tense and describing feelings.',
    'Describe a present you gave and explain how it was received.',
    'Part2',
    'Describe a gift you gave to someone.

You should say:',
    'what the gift was
who you gave it to
why you chose that gift
and explain how the person reacted when they received it',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000018',
    'A Website or App You Use Often',
    'Part 2 cue card on technology. Tests describing function and habit rather than narration.',
    'Describe a website or app you use a lot and explain why it is useful.',
    'Part2',
    'Describe a website or an app that you use often.

You should say:',
    'what it is
how you first found out about it
how often you use it and what you use it for
and explain why you find it useful',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000019',
    'A Time You Helped Someone',
    'Part 2 cue card on a past event. Rewards clear sequencing and reflective language.',
    'Describe an occasion when you helped another person.',
    'Part2',
    'Describe a time when you helped someone.

You should say:',
    'who you helped
what the situation was
what you did to help
and explain how you felt afterwards',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000001a',
    'An Interesting Older Person',
    'Part 2 cue card describing a person. Tests character adjectives and past tense storytelling.',
    'Describe an older person you find interesting and say why.',
    'Part2',
    'Describe an old person you know who you find interesting.

You should say:',
    'who this person is
how you know them
what they are like
and explain why you find this person interesting',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000001b',
    'A Piece of Technology You Find Useful',
    'Part 2 cue card on an object. Tests description, function and evaluation.',
    'Describe a device you rely on and explain what it does for you.',
    'Part2',
    'Describe a piece of technology that you find useful.

You should say:',
    'what it is
when you started using it
how you use it
and explain why it is useful to you',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000001c',
    'A Photograph You Like',
    'Part 2 cue card on a visual memory. Rewards descriptive detail and emotional vocabulary.',
    'Describe a photo that means something to you.',
    'Part2',
    'Describe a photograph that you like.

You should say:',
    'what can be seen in the photograph
when and where it was taken
who took it
and explain why you like this photograph',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000001d',
    'A Time You Were Very Busy',
    'Part 2 cue card on a stressful period. Tests past continuous and reflective evaluation.',
    'Describe a period when you had a lot to do and how you coped.',
    'Part2',
    'Describe a time when you were very busy.

You should say:',
    'when this was
what you had to do
how you managed your time
and explain how you felt during this period',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000001e',
    'A Positive Change in Your Life',
    'Part 2 cue card on personal change. Tests contrast between past and present.',
    'Describe something that changed for the better and explain the effect.',
    'Part2',
    'Describe a positive change that you have made in your life.

You should say:',
    'what the change was
when it happened
why you made this change
and explain how it has affected your life',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000001f',
    'A Celebration or Special Event',
    'Part 2 cue card on a cultural event. Rewards cultural vocabulary and past narration.',
    'Describe a celebration you took part in and say what made it memorable.',
    'Part2',
    'Describe a celebration or special event that you attended.

You should say:',
    'what the occasion was
where it took place
who was there and what people did
and explain why you remember it',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000020',
    'A Place You Would Like to Live',
    'Part 2 cue card requiring conditional and future forms rather than narration.',
    'Describe somewhere you would like to live in the future.',
    'Part2',
    'Describe a place where you would like to live in the future.

You should say:',
    'where this place is
what it is like
what you would do there
and explain why you would like to live there',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000021',
    'An Interesting Conversation',
    'Part 2 cue card on a past interaction. Tests reported speech and evaluation.',
    'Describe a conversation you remember and explain why it stood out.',
    'Part2',
    'Describe an interesting conversation you had with someone.

You should say:',
    'who you talked to
where and when the conversation took place
what you talked about
and explain why you found it interesting',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000022',
    'A Goal You Want to Achieve',
    'Part 2 cue card on future plans. Tests future forms, purpose clauses and speculation.',
    'Describe something you hope to achieve and how you plan to get there.',
    'Part2',
    'Describe a goal you would like to achieve in the future.

You should say:',
    'what the goal is
when you decided on it
what you need to do to achieve it
and explain why this goal matters to you',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000023',
    'A Difficult Task You Completed',
    'Part 2 cue card on problem solving. Rewards sequencing, past tense and reflection.',
    'Describe something hard you managed to finish and how you did it.',
    'Part2',
    'Describe a difficult task that you completed successfully.

You should say:',
    'what the task was
why it was difficult
how you completed it
and explain how you felt about the result',
    120, 'Academic', true, false
),

-- ----------------------------- Part 3 --------------------------------------
(
    '33333333-3333-4333-8333-000000000024',
    'Work and Careers',
    'Part 3 discussion. Abstract questions on employment needing extended, balanced answers.',
    'Broader discussion about job satisfaction, job security and the future of work.',
    'Part3',
    'We have been talking about work. I would like to discuss some more general questions.',
    'What makes a job satisfying for most people?
Do you think salary is the most important factor when choosing a career?
How has the idea of a job for life changed in your country?
What skills will be most valuable to workers in the future?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000025',
    'Environment and Sustainability',
    'Part 3 discussion on environmental policy. Tests cause and effect plus speculation.',
    'Broader discussion about environmental problems and who should solve them.',
    'Part3',
    'Let us consider the environment more generally.',
    'What are the most serious environmental problems facing your country?
Should individuals or governments take the main responsibility for protecting the environment?
Do you think people are more aware of environmental issues than they were in the past?
What could persuade people to change their everyday habits?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000026',
    'Family and Relationships',
    'Part 3 discussion on social change. Tests comparison across generations.',
    'Broader discussion about how family life is changing.',
    'Part3',
    'We have been talking about people close to you. Now let us discuss families more generally.',
    'How have family structures changed in your country over the last fifty years?
Do you think children today spend enough time with their parents?
What responsibilities should adults have towards their elderly relatives?
Is it better for children to grow up in a large family or a small one?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000027',
    'Cities and Urban Life',
    'Part 3 discussion on urban planning. Tests problem and solution language.',
    'Broader discussion about city growth, housing and public space.',
    'Part3',
    'Let us talk more generally about cities.',
    'Why do so many people want to live in big cities?
What problems does rapid urban growth create?
How could city planners make cities more pleasant places to live?
Do you think small towns will disappear in the future?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000028',
    'Media and Information',
    'Part 3 discussion on news and media. Tests evaluation and hedging language.',
    'Broader discussion about how people get news and whether they trust it.',
    'Part3',
    'We have been talking about the internet. I would like to ask some broader questions about the media.',
    'How do most people in your country get their news?
Do you think news reporting is generally reliable?
What are the risks of getting information mainly from social media?
Should governments control what is published online?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000029',
    'Health and Lifestyle',
    'Part 3 discussion on public health. Tests cause, effect and recommendation.',
    'Broader discussion about healthy living and the role of government.',
    'Part3',
    'Let us consider health more generally.',
    'Why do you think lifestyle related illnesses are increasing in many countries?
Whose responsibility is it to keep people healthy, the individual or the state?
How could schools encourage children to be more active?
Do you think people will live longer in the future, and would that be a good thing?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000002a',
    'Travel and Tourism',
    'Part 3 discussion on the tourism industry. Tests advantages and disadvantages.',
    'Broader discussion about why people travel and what tourism does to places.',
    'Part3',
    'We have been talking about journeys. Let us discuss travel more generally.',
    'Why do people enjoy travelling to other countries?
What benefits does tourism bring to a local area?
Can tourism also cause harm to a place, and in what way?
Do you think people will travel more or less in twenty years from now?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000002b',
    'Culture and Tradition',
    'Part 3 discussion on cultural change. Tests comparison and speculation about the future.',
    'Broader discussion about traditions, globalisation and cultural identity.',
    'Part3',
    'Let us talk more generally about culture.',
    'Why is it important for a country to protect its traditions?
Do you think globalisation is making cultures more similar?
How can young people be encouraged to take an interest in traditional customs?
What role should museums play in modern society?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000002c',
    'Money and Consumer Habits',
    'Part 3 discussion on spending and saving. Tests generalisation and evaluation.',
    'Broader discussion about consumer culture, advertising and saving money.',
    'Part3',
    'We have been talking about shopping. Now let us discuss money more generally.',
    'Do you think people today spend money more carelessly than in the past?
How much influence does advertising have on what people buy?
Should children be taught how to manage money at school?
Why do some people find it so difficult to save?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000002d',
    'Language and Communication',
    'Part 3 discussion on languages. Tests abstract reasoning and hedged opinion.',
    'Broader discussion about learning languages and how communication is changing.',
    'Part3',
    'Let us consider language more generally.',
    'Why do you think some people find it easier to learn languages than others?
Is it important for children to learn a foreign language at a young age?
What is lost when a minority language disappears?
How has technology changed the way people communicate with each other?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000002e',
    'Success and Ambition',
    'Part 3 discussion on achievement. Tests definition, comparison and opinion.',
    'Broader discussion about what success means and how attitudes differ.',
    'Part3',
    'We have been talking about goals. I would like to ask some more general questions.',
    'How do most people in your country define success?
Do you think ambition is always a positive quality?
Is success more a matter of hard work or good luck?
Has the way people measure success changed over time?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000002f',
    'Children and Growing Up',
    'Part 3 discussion on childhood. Tests comparison across generations and recommendation.',
    'Broader discussion about how childhood has changed and what children need.',
    'Part3',
    'Let us discuss childhood more generally.',
    'Do you think childhood today is easier or harder than it was a generation ago?
How much freedom should parents give young children?
What is the best way for children to learn about the world around them?
Do you think children spend too much time on screens?',
    300, 'Academic', true, false
),

-- ----------------------- Part 1 (continued) ------------------------------
(
    '33333333-3333-4333-8333-000000000030',
    'Colours',
    'Part 1 questions about colour preference. Tests simple opinion and reasons.',
    'Short questions about the colours you like and where you notice them.',
    'Part1',
    'Let us talk about colours.',
    'What is your favourite colour?
Do you like to wear bright colours?
Do colours affect your mood in any way?
Was your favourite colour different when you were a child?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000031',
    'Taking Photographs',
    'Part 1 questions about photos. Tests habit, frequency and preference.',
    'Everyday questions about the photos you take and how you keep them.',
    'Part1',
    'Now let us talk about photographs.',
    'Do you like taking photos?
What kind of photos do you usually take?
Do you prefer taking photos of people or of places?
How do you keep the photos you take?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000032',
    'Art',
    'Part 1 questions about art. Tests preference plus light school memories.',
    'Short questions about art, drawing and visiting galleries.',
    'Part1',
    'I would like to ask about art.',
    'Are you interested in art?
Did you enjoy art lessons at school?
Have you ever been to an art gallery?
Do you think art should be taught in every school?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000033',
    'Animals and Pets',
    'Part 1 questions about animals. Tests past experience and simple opinion.',
    'Everyday questions about pets and how people treat animals.',
    'Part1',
    'Let us talk about animals.',
    'Do you have a pet?
Did you have any pets when you were a child?
Are pets popular in your country?
Do you think children should learn about animals at school?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000034',
    'Television and Films',
    'Part 1 questions about watching habits. Tests frequency and preference.',
    'Short questions about what you watch and who you watch it with.',
    'Part1',
    'Now let us talk about television.',
    'How often do you watch television?
What kind of programmes do you enjoy?
Do you prefer watching films at home or at the cinema?
Has the way you watch television changed in recent years?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000035',
    'Public Holidays',
    'Part 1 questions about holidays. Tests cultural vocabulary and routine.',
    'Everyday questions about the holidays in your country and what you do on them.',
    'Part1',
    'I would like to ask about public holidays.',
    'What is the most important public holiday in your country?
How do people usually celebrate it?
What do you personally do on public holidays?
Do you think there should be more public holidays?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000036',
    'Handwriting',
    'Part 1 questions about writing by hand. Tests comparison with typing.',
    'Short questions about how often you write by hand these days.',
    'Part1',
    'Let us talk about writing.',
    'Do you write much by hand these days?
Do you think your handwriting is easy to read?
Is handwriting still important in the age of computers?
Did your school pay attention to handwriting?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000037',
    'Sleep',
    'Part 1 questions about sleeping habits. Tests routine and simple advice language.',
    'Everyday questions about how much you sleep and how well you sleep.',
    'Part1',
    'Now let us talk about sleep.',
    'How many hours do you usually sleep?
Do you ever take a nap during the day?
What helps you sleep well?
Do you think most people get enough sleep?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000038',
    'Neighbours',
    'Part 1 questions about the people near you. Tests describing people and community.',
    'Short questions about your neighbours and how well people know each other.',
    'Part1',
    'I would like to ask about neighbours.',
    'Do you know your neighbours well?
How often do you talk to them?
What makes a good neighbour?
Do you think people know their neighbours less than in the past?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000039',
    'Receiving Gifts',
    'Part 1 questions about presents. Tests past tense and feelings vocabulary.',
    'Everyday questions about the gifts you get and how you feel about them.',
    'Part1',
    'Let us talk about gifts.',
    'When did you last receive a gift?
Do you prefer giving gifts or receiving them?
Is it easy for you to choose a gift for someone?
Do people in your country give gifts on many occasions?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000003a',
    'Plants and Flowers',
    'Part 1 questions about plants. Tests preference and cultural detail.',
    'Short questions about plants at home and flowers in your country.',
    'Part1',
    'Now let us talk about plants.',
    'Do you keep any plants at home?
Did you ever grow anything as a child?
Are flowers important in your culture?
Would you like to have a garden?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000003b',
    'Housework',
    'Part 1 questions about chores. Tests frequency, preference and mild complaint language.',
    'Everyday questions about the housework you do and the parts you dislike.',
    'Part1',
    'I would like to ask about housework.',
    'What housework do you usually do?
Which household job do you dislike most?
Do you share the housework with others at home?
Did you help with housework when you were younger?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000003c',
    'Social Media',
    'Part 1 questions about online habits. Tests frequency and mild opinion.',
    'Short questions about which apps you use and how much time they take.',
    'Part1',
    'Let us talk about social media.',
    'Which social media apps do you use?
How much time do you spend on them each day?
What do you mainly use them for?
Do you think you spend too much time on social media?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000003d',
    'Foreign Languages',
    'Part 1 questions about language learning. Tests past experience and future plans.',
    'Everyday questions about the languages you have learned and want to learn.',
    'Part1',
    'Now let us talk about languages.',
    'How long have you been learning English?
What do you find most difficult about it?
Have you studied any other foreign languages?
Would you like to learn another language in the future?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000003e',
    'Being on Time',
    'Part 1 questions about punctuality. Tests habit plus cultural comparison.',
    'Short questions about whether you are usually on time and how much it matters.',
    'Part1',
    'I would like to ask about punctuality.',
    'Are you usually on time for appointments?
How do you feel when other people are late?
Do you use a calendar or a reminder app?
Is being on time important in your country?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000003f',
    'Parks and Public Places',
    'Part 1 questions about shared spaces. Tests frequency and simple evaluation.',
    'Everyday questions about the parks near you and what people do there.',
    'Part1',
    'Let us talk about parks.',
    'Is there a park near where you live?
How often do you go there?
What do people usually do in parks in your country?
Do you think there are enough public spaces in your city?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000040',
    'Childhood Memories',
    'Part 1 questions about your early years. Tests past simple and contrast with now.',
    'Short questions about what you enjoyed as a child.',
    'Part1',
    'Now let us talk about your childhood.',
    'What did you enjoy doing as a child?
Where did you usually play?
Do you still keep in touch with anyone from that time?
Do you think children today enjoy the same things you did?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000041',
    'News',
    'Part 1 questions about following the news. Tests habit and source preference.',
    'Everyday questions about how and when you follow the news.',
    'Part1',
    'I would like to ask about the news.',
    'How do you usually get your news?
How often do you check it?
What kind of news interests you most?
Do you ever discuss the news with your friends or family?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000042',
    'Clothes and Fashion',
    'Part 1 questions about what you wear. Tests preference and change over time.',
    'Short questions about the clothes you like and how much fashion matters to you.',
    'Part1',
    'Let us talk about clothes.',
    'What kind of clothes do you usually wear?
Do you follow fashion?
Where do you normally buy your clothes?
Have your clothing tastes changed over the years?',
    240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000043',
    'Emails and Letters',
    'Part 1 questions about written communication. Tests comparison of old and new habits.',
    'Everyday questions about the messages and letters you write.',
    'Part1',
    'Now let us talk about writing messages.',
    'Do you write many emails?
Have you ever written a letter by hand?
Do you prefer messaging or phoning people?
Do you think letter writing will disappear completely?',
    240, 'Academic', true, false
),

-- ----------------------- Part 2 (continued) ------------------------------
(
    '33333333-3333-4333-8333-000000000044',
    'A Person Whose Job You Find Interesting',
    'Part 2 cue card describing a person. Tests job vocabulary and explanation.',
    'Describe someone whose work you would like to know more about.',
    'Part2',
    'Describe a person whose job you find interesting.

You should say:',
    'who this person is
what their job is
how you know about their work
and explain why you find their job interesting',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000045',
    'A Childhood Friend',
    'Part 2 cue card on early friendship. Rewards past tense and character description.',
    'Describe a friend from your childhood and what you did together.',
    'Part2',
    'Describe a friend you had when you were a child.

You should say:',
    'who this friend was
how you met
what you used to do together
and explain why this friendship was important to you',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000046',
    'A Teacher Who Influenced You',
    'Part 2 cue card describing a person. Tests past tense plus evaluation of impact.',
    'Describe a teacher you still remember and explain the difference they made.',
    'Part2',
    'Describe a teacher who has influenced you.

You should say:',
    'who this teacher was
what they taught you
what their teaching style was like
and explain how they influenced you',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000047',
    'A Piece of Advice You Received',
    'Part 2 cue card on a past interaction. Tests reported speech and reflection.',
    'Describe advice someone gave you and say whether you followed it.',
    'Part2',
    'Describe a piece of good advice that someone gave you.

You should say:',
    'who gave you the advice
what the advice was
when they gave it to you
and explain how the advice helped you',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000048',
    'A Time You Were Late',
    'Part 2 cue card on a past problem. Rewards sequencing and feelings vocabulary.',
    'Describe an occasion when you arrived late and what happened.',
    'Part2',
    'Describe a time when you were late for something.

You should say:',
    'what you were late for
why you were late
what happened as a result
and explain how you felt about it',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000049',
    'A Restaurant You Like',
    'Part 2 cue card describing a place. Tests food and atmosphere vocabulary.',
    'Describe a place you enjoy eating at and explain what makes it good.',
    'Part2',
    'Describe a restaurant or cafe that you like.

You should say:',
    'where it is
what kind of food it serves
how often you go there and who with
and explain why you like this place',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000004a',
    'A Film You Watched Recently',
    'Part 2 cue card on a recent experience. Tests summarising a story plus opinion.',
    'Describe a film you saw lately and say what you thought of it.',
    'Part2',
    'Describe a film you watched recently.

You should say:',
    'what the film was about
where and when you watched it
who you watched it with
and explain what you thought of it',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000004b',
    'An Advertisement You Remember',
    'Part 2 cue card on media. Tests description plus evaluation of persuasion.',
    'Describe an advert that stayed in your memory and explain why.',
    'Part2',
    'Describe an advertisement that you remember well.

You should say:',
    'what the advertisement was for
where you saw it
what happened in it
and explain why you remember it',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000004c',
    'Something You Learned Online',
    'Part 2 cue card on self study. Tests process description and evaluation.',
    'Describe something you taught yourself using the internet.',
    'Part2',
    'Describe something useful you learned from the internet.

You should say:',
    'what you learned
where you found it
how long it took you to learn
and explain how useful it has been to you',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000004d',
    'A Crowded Place You Visited',
    'Part 2 cue card on a past event. Rewards atmosphere description and feelings.',
    'Describe a busy place you went to and how it felt.',
    'Part2',
    'Describe a crowded place you have visited.

You should say:',
    'where this place was
when you went there
why there were so many people
and explain how you felt about being there',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000004e',
    'A Wild Animal in Your Country',
    'Part 2 cue card on nature. Tests factual description and light opinion.',
    'Describe a wild animal from your country and say why it matters.',
    'Part2',
    'Describe a wild animal that lives in your country.

You should say:',
    'what animal it is
where it usually lives
what it looks like and how it behaves
and explain why this animal is important or interesting',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000004f',
    'An Item of Clothing You Like',
    'Part 2 cue card describing an object. Tests descriptive vocabulary and personal value.',
    'Describe a piece of clothing you like wearing and explain why.',
    'Part2',
    'Describe an item of clothing that you like to wear.

You should say:',
    'what it is
where you got it
when you usually wear it
and explain why you like it',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000050',
    'A Time You Had to Wait',
    'Part 2 cue card on a past situation. Tests past continuous and emotional language.',
    'Describe an occasion when you had to wait a long time.',
    'Part2',
    'Describe a time when you had to wait for something.

You should say:',
    'what you were waiting for
where you were waiting
how long you had to wait
and explain how you felt while you were waiting',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000051',
    'A Public Place That Needs Improvement',
    'Part 2 cue card on problem and solution. Tests criticism and recommendation language.',
    'Describe a place in your area that should be improved.',
    'Part2',
    'Describe a public place that you think should be improved.

You should say:',
    'what and where this place is
how often you go there
what is wrong with it now
and explain how you think it could be improved',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000052',
    'A Rule You Agree With',
    'Part 2 cue card on society. Tests explanation and justification.',
    'Describe a rule or law you think is a good one.',
    'Part2',
    'Describe a rule or law in your country that you think is a good one.

You should say:',
    'what the rule is
who it applies to
how people follow it
and explain why you think it is a good rule',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000053',
    'A Historical Building You Visited',
    'Part 2 cue card on a place. Rewards descriptive and historical vocabulary.',
    'Describe an old building you have seen and explain its significance.',
    'Part2',
    'Describe a historical building that you have visited.

You should say:',
    'where this building is
what it looks like
what you know about its history
and explain how you felt when you visited it',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000054',
    'A Game or Sport You Enjoy',
    'Part 2 cue card on an activity. Tests process description and preference.',
    'Describe a sport or game you like taking part in.',
    'Part2',
    'Describe a game or sport that you enjoy playing.

You should say:',
    'what it is
when you started playing it
who you usually play with
and explain why you enjoy it',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000055',
    'A Time You Were Surprised',
    'Part 2 cue card on a past event. Tests narrative tenses and feelings vocabulary.',
    'Describe an occasion when something surprised you.',
    'Part2',
    'Describe a time when you were surprised by something.

You should say:',
    'what happened
when and where it happened
who else was involved
and explain why it surprised you',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000056',
    'A Family Member You Spend Time With',
    'Part 2 cue card describing a person. Tests relationship and habit vocabulary.',
    'Describe a relative you are close to and what you do together.',
    'Part2',
    'Describe a family member you enjoy spending time with.

You should say:',
    'who this person is
how often you see them
what you usually do together
and explain why you enjoy spending time with them',
    120, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000057',
    'A Time You Complained About Something',
    'Part 2 cue card on a past problem. Tests complaint and resolution language.',
    'Describe an occasion when you complained and say what came of it.',
    'Part2',
    'Describe a time when you complained about something.

You should say:',
    'what you complained about
who you complained to
what you said
and explain whether you were satisfied with the result',
    120, 'Academic', true, false
),

-- ----------------------- Part 3 (continued) ------------------------------
(
    '33333333-3333-4333-8333-000000000058',
    'Advertising and Consumers',
    'Part 3 discussion on advertising. Tests evaluation and cause and effect.',
    'Broader discussion about how advertising works and whether it should be limited.',
    'Part3',
    'We have been talking about advertisements. I would like to discuss some more general questions.',
    'Why do companies spend so much money on advertising?
Do you think advertising influences children more than adults?
Should some kinds of advertising be banned?
How has online advertising changed the way products are sold?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000059',
    'Transport and Traffic',
    'Part 3 discussion on mobility. Tests problem and solution plus speculation.',
    'Broader discussion about congestion, public transport and future travel.',
    'Part3',
    'Let us consider transport more generally.',
    'Why is traffic congestion getting worse in many cities?
What could governments do to encourage people to use public transport?
Do you think private cars will still be common in fifty years?
How does poor transport affect people on low incomes?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000005a',
    'Housing and Living Space',
    'Part 3 discussion on housing. Tests comparison and policy reasoning.',
    'Broader discussion about where people live and whether housing is affordable.',
    'Part3',
    'We have been talking about homes. Now let us discuss housing more generally.',
    'Why is housing so expensive in many large cities?
Is it better for young people to rent or to buy?
How have homes changed compared with fifty years ago?
What should governments do about a shortage of housing?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000005b',
    'Animals and Conservation',
    'Part 3 discussion on wildlife. Tests ethical reasoning and speculation.',
    'Broader discussion about protecting animals and the role of zoos.',
    'Part3',
    'Let us discuss animals more generally.',
    'Why are so many species under threat today?
Do you think zoos play a useful role in protecting wildlife?
Should people change their diet to protect animals and the environment?
Whose responsibility is it to protect endangered species?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000005c',
    'Art and Creativity',
    'Part 3 discussion on the arts. Tests abstract reasoning and funding debate.',
    'Broader discussion about the value of art and who should pay for it.',
    'Part3',
    'We have been talking about art. I would like to ask some broader questions.',
    'Why do societies value art?
Should governments spend public money on the arts?
Do you think creativity can be taught, or is it something people are born with?
How has technology changed the way art is made and shared?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000005d',
    'Friendship and Social Bonds',
    'Part 3 discussion on relationships. Tests generalisation and comparison.',
    'Broader discussion about how friendships form and change over a lifetime.',
    'Part3',
    'Let us discuss friendship more generally.',
    'Why do some friendships last a lifetime while others fade?
Is it harder to make new friends as an adult?
Has social media changed what friendship means?
Do you think people have fewer close friends than they used to?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000005e',
    'Leisure and Free Time',
    'Part 3 discussion on work life balance. Tests cause, effect and recommendation.',
    'Broader discussion about how people relax and whether they have enough time.',
    'Part3',
    'We have been talking about free time. Now let us consider leisure more generally.',
    'Do people in your country have enough leisure time?
How has the way people relax changed over the last generation?
Why do some people find it difficult to switch off from work?
Should employers be responsible for the work life balance of their staff?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000005f',
    'Food and Eating Habits',
    'Part 3 discussion on diet and food culture. Tests comparison and speculation.',
    'Broader discussion about how eating habits are changing and why.',
    'Part3',
    'Let us discuss food more generally.',
    'How have eating habits in your country changed in recent decades?
Why do fewer families eat together than in the past?
Should governments discourage people from eating unhealthy food?
What effect does imported food have on local farmers?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000060',
    'Sport and Competition',
    'Part 3 discussion on sport in society. Tests evaluation and balanced argument.',
    'Broader discussion about professional sport, competition and public funding.',
    'Part3',
    'We have been talking about sport. I would like to ask some more general questions.',
    'Why are professional athletes paid so much in some countries?
Is competition between children healthy?
Should governments spend money on hosting major sporting events?
What benefits does sport bring to a community?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000061',
    'Ageing and Older People',
    'Part 3 discussion on demographics. Tests cause, effect and policy language.',
    'Broader discussion about ageing populations and how societies respond.',
    'Part3',
    'Let us consider older people more generally.',
    'What role do older people play in families in your country?
What problems does an ageing population create for a society?
Should retirement ages be raised as people live longer?
How could younger and older generations understand each other better?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000062',
    'Rules and Laws',
    'Part 3 discussion on social order. Tests justification and hypothetical reasoning.',
    'Broader discussion about why people obey rules and how laws should change.',
    'Part3',
    'We have been talking about rules. Now let us discuss laws more generally.',
    'Why do some people break rules even when they agree with them?
Are strict punishments an effective way to change behaviour?
How should a country decide when a law needs to be changed?
Should the same laws apply to everyone in every situation?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000063',
    'History and Heritage',
    'Part 3 discussion on the past. Tests abstract reasoning and funding debate.',
    'Broader discussion about preserving old buildings and teaching history.',
    'Part3',
    'Let us discuss history more generally.',
    'Why is it important for people to learn about their history?
Should old buildings be preserved even when they are expensive to maintain?
Do you think history is taught well in schools?
How can a country balance new development with protecting its heritage?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000064',
    'Films and Entertainment',
    'Part 3 discussion on the film industry. Tests cultural analysis and speculation.',
    'Broader discussion about cinema, streaming and what people watch.',
    'Part3',
    'We have been talking about films. I would like to ask some broader questions.',
    'Why do people enjoy watching films from other countries?
Has streaming changed the kind of films that get made?
Do you think cinemas will survive in the future?
Can films influence the way people think about social issues?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000065',
    'Science and Research',
    'Part 3 discussion on science policy. Tests speculation and priority reasoning.',
    'Broader discussion about scientific progress and how it should be funded.',
    'Part3',
    'Let us consider science more generally.',
    'Which areas of scientific research should receive the most funding?
Why are some people suspicious of science?
How well do scientists explain their work to the public?
Do you think scientific progress always improves peoples lives?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000066',
    'Online Shopping and Retail',
    'Part 3 discussion on commerce. Tests advantages, disadvantages and prediction.',
    'Broader discussion about how online shopping is changing high streets.',
    'Part3',
    'We have been talking about shopping. Now let us discuss retail more generally.',
    'Why has online shopping grown so quickly?
What effect has it had on traditional shops?
Do you think shopping centres will still exist in twenty years?
How does online shopping affect the environment?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000067',
    'Privacy and Personal Information',
    'Part 3 discussion on data and privacy. Tests balanced argument and hedging.',
    'Broader discussion about what companies and governments know about people.',
    'Part3',
    'Let us discuss privacy more generally.',
    'How much personal information do people share online without realising it?
Should companies be allowed to use customer data to sell products?
Is public surveillance such as street cameras a good thing?
How can people protect their privacy in the digital age?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000068',
    'Public Services and Government Spending',
    'Part 3 discussion on public policy. Tests prioritisation and justification.',
    'Broader discussion about how governments should spend taxes.',
    'Part3',
    'We have been talking about services in your area. I would like to ask some broader questions.',
    'Which public services matter most to ordinary people?
How should a government decide where to spend its money?
Should services such as healthcare and education always be free?
What happens to a community when local services are cut?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000069',
    'Volunteering and Community',
    'Part 3 discussion on civic life. Tests motivation analysis and recommendation.',
    'Broader discussion about volunteering and helping other people.',
    'Part3',
    'Let us discuss helping others more generally.',
    'Why do some people give up their free time to volunteer?
What kinds of voluntary work are most useful to a community?
Should schools require students to do community service?
Is a strong sense of community disappearing in modern cities?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000006a',
    'Equality and Opportunity',
    'Part 3 discussion on social mobility. Tests cause, effect and policy reasoning.',
    'Broader discussion about fairness, opportunity and the gap between rich and poor.',
    'Part3',
    'We have been talking about success. Now let us discuss opportunity more generally.',
    'Does everyone in your country have the same chances in life?
How much does family background affect what a person achieves?
What can education do to reduce inequality?
Should governments try to narrow the gap between rich and poor?',
    300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-00000000006b',
    'Climate and Extreme Weather',
    'Part 3 discussion on climate. Tests cause and effect plus international reasoning.',
    'Broader discussion about changing weather patterns and how people adapt.',
    'Part3',
    'Let us consider the weather more generally.',
    'Have weather patterns in your country changed in recent years?
How do extreme weather events affect ordinary people?
Should wealthier countries help poorer ones deal with climate change?
What can individuals realistically do about a global problem?',
    300, 'Academic', true, false
)
ON CONFLICT ("SpeakingPromptId") DO UPDATE SET
    "Topic"        = EXCLUDED."Topic",
    "Description"  = EXCLUDED."Description",
    "Preview"      = EXCLUDED."Preview",
    "Part"         = EXCLUDED."Part",
    "QuestionText" = EXCLUDED."QuestionText",
    "Cuepoints"    = EXCLUDED."Cuepoints",
    "Duration"     = EXCLUDED."Duration",
    "Level"        = EXCLUDED."Level",
    "UpdatedAt"    = NOW();

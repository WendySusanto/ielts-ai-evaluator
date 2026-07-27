-- Seed data: IELTS writing + speaking prompts.
-- Run in the Neon SQL Editor (or psql) after `dotnet ef database update`.
-- Safe to re-run: fixed UUIDs + ON CONFLICT DO NOTHING.
--
-- ponytail: plain SQL instead of EF HasData, so it can be pasted straight into
-- the Neon console. Move to HasData if seeding ever needs to happen automatically
-- on every fresh database (CI, new dev machines).
--
-- Task 1 images are QuickChart URLs: the chart is rendered on demand from the
-- config in the query string, so there is nothing to host. Edit the numbers in
-- the URL to change the chart. Strings are dollar-quoted ($q$...$q$) because the
-- chart configs contain single quotes.

-- ---------------------------------------------------------------------------
-- Writing Task 1 (Academic) — chart description
-- ---------------------------------------------------------------------------

INSERT INTO "WritingPrompts" (
    "WritingPromptId", "Topic", "Description", "Preview", "QuestionType",
    "QuestionText", "Duration", "MinimumWords", "TaskType", "Level",
    "ImageUrl", "ImageDescription", "IsActive", "IsDeleted"
) VALUES
(
    '11111111-1111-4111-8111-000000000001',
    'Telephone Subscriptions 1995-2020',
    'Academic Task 1 line graph. Tests the ability to describe trends over time, identify a crossover point, and group two contrasting lines into a coherent overview.',
    'The graph shows mobile phone and landline subscriptions per 100 people between 1995 and 2020.',
    'Line Graph',
    'The graph below shows the number of mobile phone and landline telephone subscriptions per 100 people in one country between 1995 and 2020.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    20, 150, 'Task1', 'Academic',
    $q$https://quickchart.io/chart?w=700&h=420&bkg=white&c={type:'line',data:{labels:['1995','2000','2005','2010','2015','2020'],datasets:[{label:'Mobile%20subscriptions',data:[9,45,120,240,310,345],borderColor:'rgb(37,99,235)',fill:false},{label:'Landline%20subscriptions',data:[95,110,118,105,72,41],borderColor:'rgb(220,38,38)',fill:false}]},options:{title:{display:true,text:'Telephone%20subscriptions%20per%20100%20people,%201995-2020'},scales:{yAxes:[{ticks:{beginAtZero:true},scaleLabel:{display:true,labelString:'Per%20100%20people'}}]}}}$q$,
    'Line graph. Mobile subscriptions per 100 people rise steadily from 9 in 1995 to 345 in 2020. Landlines rise gently from 95 to a peak of 118 in 2005, then fall to 41 by 2020. The two lines cross between 2000 and 2005.',
    true, false
),
(
    '11111111-1111-4111-8111-000000000002',
    'Household Spending in Three Countries',
    'Academic Task 1 grouped bar chart. Tests comparison across categories and across countries without describing every single value.',
    'The chart compares how households in Japan, Malaysia and Germany divided their spending across five categories in 2019.',
    'Bar Chart',
    'The chart below shows the percentage of household spending across five categories in Japan, Malaysia and Germany in 2019.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    20, 150, 'Task1', 'Academic',
    $q$https://quickchart.io/chart?w=700&h=420&bkg=white&c={type:'bar',data:{labels:['Housing','Food','Transport','Leisure','Healthcare'],datasets:[{label:'Japan',data:[26,22,14,18,20],backgroundColor:'rgb(37,99,235)'},{label:'Malaysia',data:[31,29,17,12,11],backgroundColor:'rgb(16,185,129)'},{label:'Germany',data:[34,17,15,20,14],backgroundColor:'rgb(245,158,11)'}]},options:{title:{display:true,text:'Household%20spending%20by%20category%20(%25%20of%20total),%202019'},scales:{yAxes:[{ticks:{beginAtZero:true},scaleLabel:{display:true,labelString:'Percentage%20of%20total%20spending'}}]}}}$q$,
    'Grouped bar chart, percentages by country. Housing is the largest category everywhere (Germany 34%, Malaysia 31%, Japan 26%). Malaysia spends most on food (29%) and least on healthcare (11%), while Japan spends most on healthcare (20%).',
    true, false
),
(
    '11111111-1111-4111-8111-000000000003',
    'Electricity Generation by Source',
    'Academic Task 1 pie chart. Tests proportion language and sensible grouping of small segments rather than listing each slice.',
    'The pie chart shows the share of electricity generated from six different sources in 2020.',
    'Pie Chart',
    'The pie chart below shows the proportion of electricity generated from different sources in one country in 2020.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    20, 150, 'Task1', 'Academic',
    $q$https://quickchart.io/chart?w=620&h=420&bkg=white&c={type:'pie',data:{labels:['Coal','Natural%20gas','Hydro','Nuclear','Wind%20and%20solar','Oil'],datasets:[{data:[38,23,16,10,9,4],backgroundColor:['rgb(71,85,105)','rgb(37,99,235)','rgb(6,182,212)','rgb(168,85,247)','rgb(16,185,129)','rgb(220,38,38)']}]},options:{title:{display:true,text:'Electricity%20generation%20by%20source,%202020%20(%25)'},plugins:{datalabels:{color:'white',font:{size:16,weight:'bold'}}}}}$q$,
    'Pie chart. Coal is the largest source at 38%, followed by natural gas at 23% and hydro at 16%. Nuclear (10%), wind and solar (9%) and oil (4%) make up the remainder. Fossil fuels together account for 65%.',
    true, false
),
(
    '11111111-1111-4111-8111-000000000004',
    'Coffee Production and Price',
    'Academic Task 1 combined bar and line chart with two vertical axes. Tests handling of two different units and describing whether the two measures move together.',
    'The chart shows global coffee production in millions of bags alongside the average price per pound from 2016 to 2021.',
    'Bar Chart',
    'The chart below shows global coffee production in millions of bags and the average world price in US cents per pound between 2016 and 2021.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    20, 150, 'Task1', 'Academic',
    $q$https://quickchart.io/chart?w=700&h=420&bkg=white&c={type:'bar',data:{labels:['2016','2017','2018','2019','2020','2021'],datasets:[{type:'line',label:'Average%20price%20(US%20cents%20per%20lb)',data:[137,124,113,101,109,168],borderColor:'rgb(37,99,235)',borderWidth:3,fill:false,yAxisID:'right'},{type:'bar',label:'Production%20(million%20bags)',data:[152,159,168,170,164,167],backgroundColor:'rgba(180,83,9,0.75)',yAxisID:'left'}]},options:{title:{display:true,text:'Global%20coffee%20production%20and%20average%20price,%202016-2021'},scales:{yAxes:[{id:'left',position:'left',ticks:{beginAtZero:true},scaleLabel:{display:true,labelString:'Million%20bags'}},{id:'right',position:'right',ticks:{beginAtZero:true},scaleLabel:{display:true,labelString:'US%20cents%20per%20lb'}}]}}}$q$,
    'Combined chart. Bars show production rising from 152 million bags in 2016 to a peak of 170 in 2019, dipping in 2020, then recovering to 167. The line shows price falling from 137 cents to 101 by 2019 before climbing sharply to 168 in 2021.',
    true, false
)
ON CONFLICT ("WritingPromptId") DO NOTHING;

-- ---------------------------------------------------------------------------
-- Writing Task 2 — essay
-- ---------------------------------------------------------------------------

INSERT INTO "WritingPrompts" (
    "WritingPromptId", "Topic", "Description", "Preview", "QuestionType",
    "QuestionText", "Duration", "MinimumWords", "TaskType", "Level",
    "ImageUrl", "ImageDescription", "IsActive", "IsDeleted"
) VALUES
(
    '22222222-2222-4222-8222-000000000001',
    'Compulsory Community Service',
    'Agree/disagree opinion essay on education policy. Rewards a clear position held consistently from introduction to conclusion.',
    'Should unpaid community service be a required part of high school? Argue for or against.',
    'Essay',
    'Some people believe that unpaid community service should be a compulsory part of high school programmes, for example working for a charity, improving the neighbourhood or teaching sports to younger children.

To what extent do you agree or disagree?',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-000000000002',
    'Public Transport or New Roads',
    'Discuss-both-views essay on infrastructure spending. Requires balanced coverage of two positions plus a stated personal opinion.',
    'Governments can fund public transport or build more roads. Discuss both sides and give your view.',
    'Essay',
    'Some people think that governments should spend more money on improving public transport, while others believe that funding is better spent on building and widening roads.

Discuss both these views and give your own opinion.',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-000000000003',
    'Working From Home',
    'Advantages-outweigh-disadvantages essay on modern work. Tests whether the candidate actually weighs the two sides rather than merely listing them.',
    'More people now work from home instead of commuting. Do the advantages outweigh the disadvantages?',
    'Essay',
    'An increasing number of people are working from home rather than travelling to an office each day.

Do the advantages of this development outweigh the disadvantages?',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-000000000004',
    'Food Waste',
    'Problem and solution essay on the environment. Both halves must be answered; solutions should connect back to the causes given.',
    'Food waste is rising in many countries. What causes it, and what can be done about it?',
    'Essay',
    'In many countries, the amount of food that is thrown away by households and supermarkets is increasing.

What are the causes of this problem, and what measures could be taken to reduce it?',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-000000000005',
    'Migration to Large Cities',
    'Two-part question on urbanisation. A common band-limiter is answering only the first half, so both parts need roughly equal development.',
    'Young people increasingly leave small towns for big cities. Why, and how does it affect the places they leave?',
    'Essay',
    'Many young people today leave their home town to find work in large cities.

Why is this happening? What effects does it have on the communities they leave behind?',
    40, 250, 'Task2', 'General', NULL, NULL, true, false
)
ON CONFLICT ("WritingPromptId") DO NOTHING;

-- ---------------------------------------------------------------------------
-- Speaking — Duration is in SECONDS
-- ---------------------------------------------------------------------------

INSERT INTO "SpeakingPrompts" (
    "SpeakingPromptId", "Topic", "Description", "Preview", "Part",
    "QuestionText", "Cuepoints", "Duration", "Level", "IsActive", "IsDeleted"
) VALUES
(
    '33333333-3333-4333-8333-000000000001',
    'Hometown',
    'Part 1 warm-up questions on a familiar topic. Answers should be two or three sentences, not one word and not a speech.',
    'Short everyday questions about where you come from and how it has changed.',
    'Part1',
    'Let us talk about your hometown. Where is your hometown, and what is it like? Have you always lived there? What do you like most about it? Has it changed much in recent years?',
    NULL, 240, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000002',
    'Work and Study',
    'Part 1 questions on daily routine. Tests fluent, natural answers with light reasons and examples.',
    'Everyday questions about what you do, why you chose it, and what you would change.',
    'Part1',
    'Now let us talk about what you do. Do you work or are you a student? Why did you choose that job or subject? What do you enjoy most about it? Is there anything you would like to change about it?',
    NULL, 240, 'Academic', true, false
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
    'We have been talking about technology. I would like to discuss some more general questions.

How has technology changed the way people communicate? Do you think older people find it harder to adapt to new technology, and why? Some say technology makes people less social. Would you agree? What effect might artificial intelligence have on employment in the next twenty years?',
    NULL, 300, 'Academic', true, false
),
(
    '33333333-3333-4333-8333-000000000007',
    'Education and Learning',
    'Part 3 discussion on education policy. Tests comparison, opinion and speculation about the future.',
    'Broader discussion about schooling, exams and lifelong learning.',
    'Part3',
    'Let us consider education more generally.

What do you think are the most important qualities of a good teacher? Should schools focus more on academic subjects or practical skills? How has the way people learn changed compared with a generation ago? Do you think examinations are a fair way to measure ability?',
    NULL, 300, 'Academic', true, false
)
ON CONFLICT ("SpeakingPromptId") DO NOTHING;

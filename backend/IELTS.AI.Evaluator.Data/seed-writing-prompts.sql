-- ---------------------------------------------------------------------------
-- Every IELTS Writing prompt, Task 1 and Task 2, Academic and General Training.
-- Single source of truth: this file replaces the writing blocks that used to live in
-- seed.sql. Topics follow the real exam question pool.
--
-- One idempotent upsert. Run it on a fresh database or on production — fixed UUIDs mean
-- every row either inserts or updates the row with that id in place, so re-running is safe
-- and brings existing rows up to the current wording.
--   psql "$DATABASE_URL" -f seed-writing-prompts.sql
--
-- What a re-run overwrites: the content columns listed in the ON CONFLICT clause. Admin
-- edits to those fields on these seeded rows are lost. IsActive and IsDeleted are
-- deliberately left alone, so a prompt an admin switched off or deleted stays off.
--
-- Duration is in MINUTES. Task1 = 20 min / 150 words, Task2 = 40 min / 250 words.
--
-- Academic Task 1 images are QuickChart URLs: the chart is rendered on demand from the
-- config in the query string, so there is nothing to host. Edit the numbers in the URL to
-- change the chart. Those strings are dollar-quoted ($q$...$q$) because the chart configs
-- contain single quotes. General Training Task 1 is a letter, so it carries no image.
-- ---------------------------------------------------------------------------

INSERT INTO "WritingPrompts" (
    "WritingPromptId", "Topic", "Description", "Preview", "QuestionType",
    "QuestionText", "Duration", "MinimumWords", "TaskType", "Level",
    "ImageUrl", "ImageDescription", "IsActive", "IsDeleted"
) VALUES

-- --------- Task 1 Academic — chart description --------------------------
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
),
(
    '11111111-1111-4111-8111-000000000005',
    'International Students by Destination',
    'Academic Task 1 line graph with four lines. Tests selective reporting: grouping lines that behave alike instead of narrating each one year by year.',
    'The graph shows international student enrolments in four countries between 2010 and 2022.',
    'Line Graph',
    'The graph below shows the number of international students enrolled at universities in four countries between 2010 and 2022.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    20, 150, 'Task1', 'Academic',
    $q$https://quickchart.io/chart?w=700&h=420&bkg=white&c={type:'line',data:{labels:['2010','2013','2016','2019','2022'],datasets:[{label:'United%20States',data:[690,820,1040,1095,948],borderColor:'rgb(37,99,235)',fill:false},{label:'United%20Kingdom',data:[405,425,438,496,680],borderColor:'rgb(220,38,38)',fill:false},{label:'Australia',data:[271,249,335,442,363],borderColor:'rgb(16,185,129)',fill:false},{label:'Canada',data:[142,205,312,498,551],borderColor:'rgb(245,158,11)',fill:false}]},options:{title:{display:true,text:'International%20student%20enrolments%20(thousands),%202010-2022'},scales:{yAxes:[{ticks:{beginAtZero:true},scaleLabel:{display:true,labelString:'Thousands%20of%20students'}}]}}}$q$,
    'Line graph, thousands of students. The United States leads throughout, rising from 690 in 2010 to a peak of 1,095 in 2019 before falling to 948. Canada grows fastest, from 142 to 551. The United Kingdom is flat until 2019 then jumps to 680. Australia rises to 442 in 2019 then drops to 363.',
    true, false
),
(
    '11111111-1111-4111-8111-000000000006',
    'Population Aged 65 and Over',
    'Academic Task 1 bar chart with a projected year. Tests mixing past tense for historic data with future forms for the projection.',
    'The chart compares the share of people aged 65 and over in four countries in 2000, 2020 and projected for 2040.',
    'Bar Chart',
    'The chart below shows the percentage of the population aged 65 and over in four countries in 2000 and 2020, with projected figures for 2040.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    20, 150, 'Task1', 'Academic',
    $q$https://quickchart.io/chart?w=700&h=420&bkg=white&c={type:'bar',data:{labels:['Japan','Germany','Brazil','India'],datasets:[{label:'2000',data:[17,16,5,4],backgroundColor:'rgb(37,99,235)'},{label:'2020',data:[28,22,9,7],backgroundColor:'rgb(16,185,129)'},{label:'2040%20(projected)',data:[35,28,18,13],backgroundColor:'rgb(245,158,11)'}]},options:{title:{display:true,text:'Population%20aged%2065%20and%20over%20(%25%20of%20total)'},scales:{yAxes:[{ticks:{beginAtZero:true},scaleLabel:{display:true,labelString:'Percentage%20of%20population'}}]}}}$q$,
    'Grouped bar chart, percentages. Japan is highest at every point, rising from 17% in 2000 to 28% in 2020 and a projected 35% in 2040. Germany follows a similar path from 16% to 28%. Brazil and India start much lower at 5% and 4% but more than triple by 2040, reaching 18% and 13%.',
    true, false
),
(
    '11111111-1111-4111-8111-000000000007',
    'Energy Sources 2000 and 2020',
    'Academic Task 1 comparison across two years. Tests proportion language plus describing what changed between the two snapshots.',
    'The chart compares the share of energy produced from five sources in 2000 and in 2020.',
    'Bar Chart',
    'The chart below shows the proportion of energy produced from five different sources in one country in 2000 and in 2020.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    20, 150, 'Task1', 'Academic',
    $q$https://quickchart.io/chart?w=700&h=420&bkg=white&c={type:'bar',data:{labels:['Coal','Oil','Natural%20gas','Nuclear','Renewables'],datasets:[{label:'2000',data:[42,28,16,10,4],backgroundColor:'rgb(71,85,105)'},{label:'2020',data:[21,19,27,9,24],backgroundColor:'rgb(16,185,129)'}]},options:{title:{display:true,text:'Energy%20production%20by%20source%20(%25%20of%20total),%202000%20vs%202020'},scales:{yAxes:[{ticks:{beginAtZero:true},scaleLabel:{display:true,labelString:'Percentage%20of%20total'}}]}}}$q$,
    'Paired bar chart, percentages. Coal halves from 42% to 21% and oil falls from 28% to 19%. Natural gas rises from 16% to 27% and renewables grow six-fold from 4% to 24%. Nuclear is almost unchanged at around 10%.',
    true, false
),
(
    '11111111-1111-4111-8111-000000000008',
    'Reasons for Choosing a University',
    'Academic Task 1 horizontal bar chart of survey responses. Tests ranking language and grouping the minor categories rather than listing all of them.',
    'The chart shows the reasons students gave for choosing their university.',
    'Bar Chart',
    'The chart below shows the main reasons given by students in one country for choosing the university they attend.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    20, 150, 'Task1', 'Academic',
    $q$https://quickchart.io/chart?w=700&h=420&bkg=white&c={type:'horizontalBar',data:{labels:['Course%20reputation','Tuition%20cost','Close%20to%20home','Campus%20facilities','Advice%20from%20family','Graduate%20job%20rate'],datasets:[{label:'%25%20of%20students',data:[34,22,15,11,10,8],backgroundColor:'rgb(37,99,235)'}]},options:{legend:{display:false},title:{display:true,text:'Main%20reason%20for%20choosing%20a%20university%20(%25%20of%20students)'},scales:{xAxes:[{ticks:{beginAtZero:true},scaleLabel:{display:true,labelString:'Percentage%20of%20students'}}]}}}$q$,
    'Horizontal bar chart, percentages. Course reputation is by far the most common reason at 34%, followed by tuition cost at 22%. Being close to home accounts for 15%. Campus facilities (11%), family advice (10%) and graduate job rate (8%) make up the rest.',
    true, false
),
(
    '11111111-1111-4111-8111-000000000009',
    'Household Waste Composition',
    'Academic Task 1 doughnut chart. Tests proportion vocabulary and sensible grouping of the smaller segments.',
    'The chart shows what household rubbish in one city is made up of.',
    'Pie Chart',
    'The chart below shows the composition of household waste collected in one city in a single year.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    20, 150, 'Task1', 'Academic',
    $q$https://quickchart.io/chart?w=620&h=420&bkg=white&c={type:'doughnut',data:{labels:['Food%20waste','Paper%20and%20card','Plastics','Glass','Metals','Other'],datasets:[{data:[31,24,18,10,7,10],backgroundColor:['rgb(16,185,129)','rgb(245,158,11)','rgb(37,99,235)','rgb(6,182,212)','rgb(71,85,105)','rgb(168,85,247)']}]},options:{title:{display:true,text:'Household%20waste%20by%20material%20(%25%20of%20total)'},plugins:{datalabels:{color:'white',font:{size:16,weight:'bold'}}}}}$q$,
    'Doughnut chart. Food waste is the largest component at 31%, followed by paper and card at 24% and plastics at 18%. Glass (10%), metals (7%) and other materials (10%) account for the remainder.',
    true, false
),
(
    '11111111-1111-4111-8111-00000000000a',
    'Water Use by Sector',
    'Academic Task 1 stacked bar chart. Tests describing both the totals and the internal split, which is where weaker answers lose the overview mark.',
    'The chart shows how four regions divide their water use between agriculture, industry and households.',
    'Bar Chart',
    'The chart below shows how water is used in four regions of the world, divided between agriculture, industry and household use.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    20, 150, 'Task1', 'Academic',
    $q$https://quickchart.io/chart?w=700&h=420&bkg=white&c={type:'bar',data:{labels:['South%20Asia','Africa','Europe','North%20America'],datasets:[{label:'Agriculture',data:[91,84,33,39],backgroundColor:'rgb(16,185,129)'},{label:'Industry',data:[4,6,52,48],backgroundColor:'rgb(71,85,105)'},{label:'Households',data:[5,10,15,13],backgroundColor:'rgb(37,99,235)'}]},options:{title:{display:true,text:'Water%20use%20by%20sector%20(%25%20of%20total%20withdrawals)'},scales:{xAxes:[{stacked:true}],yAxes:[{stacked:true,ticks:{beginAtZero:true},scaleLabel:{display:true,labelString:'Percentage%20of%20water%20used'}}]}}}$q$,
    'Stacked bar chart, percentages summing to 100 per region. Agriculture dominates in South Asia (91%) and Africa (84%), while industry takes the largest share in Europe (52%) and North America (48%). Household use is the smallest everywhere, ranging from 5% in South Asia to 15% in Europe.',
    true, false
),

-- --------- Task 1 General Training — letter -----------------------------
(
    '11111111-1111-4111-8111-000000000020',
    'Complaint About Faulty Equipment',
    'General Training Task 1 formal letter of complaint. Tests a consistently formal register and a clear statement of the action being requested.',
    'Write to a shop manager about equipment that stopped working and was not replaced.',
    'Letter',
    'You recently bought a piece of equipment for your kitchen, but it stopped working after two days. You telephoned the shop, but nothing was done.

Write a letter to the manager of the shop. In your letter:
- describe the problem with the equipment
- explain what happened when you telephoned the shop
- say what you would like the manager to do

Begin your letter as follows: Dear Sir or Madam,',
    20, 150, 'Task1', 'General', NULL, NULL, true, false
),
(
    '11111111-1111-4111-8111-000000000021',
    'Request for Time Off Work',
    'General Training Task 1 semi-formal letter to a manager. Tests polite request forms and offering a workable arrangement rather than simply demanding leave.',
    'Write to your manager asking for unpaid leave and explaining how your work will be covered.',
    'Letter',
    'You need to take some unpaid time off work to deal with a family matter.

Write a letter to your manager. In your letter:
- explain why you need the time off
- say how long you will be away
- suggest how your work could be covered while you are absent

Begin your letter as follows: Dear ...,',
    20, 150, 'Task1', 'General', NULL, NULL, true, false
),
(
    '11111111-1111-4111-8111-000000000022',
    'Invitation to a Friend',
    'General Training Task 1 informal letter. Tests a genuinely friendly register, which candidates often lose by writing too formally.',
    'Write to a friend inviting them to an event and telling them what to expect.',
    'Letter',
    'You are organising a party to celebrate a special occasion and you would like a friend who lives in another city to come.

Write a letter to your friend. In your letter:
- explain what you are celebrating
- give the details of when and where the party will be
- suggest what your friend could do during the rest of their visit

Begin your letter as follows: Dear ...,',
    20, 150, 'Task1', 'General', NULL, NULL, true, false
),
(
    '11111111-1111-4111-8111-000000000023',
    'Application for a Part-Time Job',
    'General Training Task 1 formal application letter. Tests selling relevant experience concisely within the word limit.',
    'Write to apply for an advertised part-time job and explain why you suit it.',
    'Letter',
    'You have seen an advertisement for a part-time job at a local sports centre.

Write a letter to the centre manager. In your letter:
- explain which job you are applying for and where you saw it advertised
- describe the relevant experience you have
- say when you would be available to work

Begin your letter as follows: Dear Sir or Madam,',
    20, 150, 'Task1', 'General', NULL, NULL, true, false
),
(
    '11111111-1111-4111-8111-000000000024',
    'Letter to a Neighbour',
    'General Training Task 1 semi-formal letter about a local problem. Tests raising an issue politely while still being direct about the outcome wanted.',
    'Write to a neighbour about noise from building work and suggest a solution.',
    'Letter',
    'Your neighbour is having building work done on their house, and the noise is disturbing you.

Write a letter to your neighbour. In your letter:
- explain how the noise is affecting you
- say what you have already tried to do about it
- suggest an arrangement that would work for both of you

Begin your letter as follows: Dear ...,',
    20, 150, 'Task1', 'General', NULL, NULL, true, false
),
(
    '11111111-1111-4111-8111-000000000025',
    'Thanking Someone for Their Help',
    'General Training Task 1 informal thank-you letter. Tests warm, natural language and a concrete offer in return.',
    'Write to thank someone who helped you during a difficult period.',
    'Letter',
    'A friend helped you a great deal when you were unwell recently.

Write a letter to your friend. In your letter:
- thank them for what they did
- explain how their help made a difference to you
- suggest a way you could repay them

Begin your letter as follows: Dear ...,',
    20, 150, 'Task1', 'General', NULL, NULL, true, false
),

-- --------- Task 2 — essay -----------------------------------------------
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
),
(
    '22222222-2222-4222-8222-000000000006',
    'Automation and Employment',
    'Advantages-outweigh-disadvantages essay on technology. Weaker answers list both sides without ever weighing them, which is what this prompt targets.',
    'Machines are replacing human workers in many industries. Do the advantages outweigh the disadvantages?',
    'Essay',
    'In many industries, machines and computer programmes are replacing work that was previously done by people.

Do the advantages of this trend outweigh the disadvantages?',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-000000000007',
    'Space Exploration Spending',
    'Discuss-both-views essay on public spending priorities. Requires even coverage of both positions plus a clearly stated personal view.',
    'Should money go to space exploration or to problems on Earth? Discuss both sides and give your view.',
    'Essay',
    'Some people believe that money spent on space exploration would be better used to solve problems here on Earth, while others argue that exploring space brings important benefits.

Discuss both these views and give your own opinion.',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-000000000008',
    'Traffic Congestion in Cities',
    'Problem and solution essay on urban policy. Solutions must answer the causes given, not float free of them.',
    'Traffic congestion is worsening in large cities. What causes it, and how can it be reduced?',
    'Essay',
    'Traffic congestion is becoming a serious problem in many large cities around the world.

What are the causes of this problem, and what measures could be taken to solve it?',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-000000000009',
    'Government Funding for the Arts',
    'Agree/disagree opinion essay on public spending. Rewards a position held consistently rather than a fence-sitting answer.',
    'Should public money fund the arts, or go to health and education instead?',
    'Essay',
    'Some people think that governments should not spend public money on the arts, such as museums, theatres and music, and that this money should go to health and education instead.

To what extent do you agree or disagree?',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-00000000000a',
    'Retirement Age',
    'Discuss-both-views essay on an ageing workforce. Tests balanced treatment of employers and older workers alike.',
    'Should people work into later life, or retire earlier? Discuss both views and give your opinion.',
    'Essay',
    'In some countries the retirement age is being raised so that people work into their late sixties, while others argue that people should be able to retire earlier and make way for younger workers.

Discuss both these views and give your own opinion.',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-00000000000b',
    'Diet and Public Health',
    'Causes and solutions essay on health policy. Both halves must be developed; a long causes section with a thin solutions section is the usual failure.',
    'Unhealthy diets are becoming more common. Why, and what can be done?',
    'Essay',
    'In many countries people are eating more processed and fast food than in the past, and rates of diet-related illness are rising.

What are the reasons for this, and what could be done to encourage healthier eating?',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-00000000000c',
    'Keeping Animals in Zoos',
    'Agree/disagree opinion essay on an ethical topic. Tests handling a counter-argument without abandoning the stated position.',
    'Should zoos be closed, or do they serve a useful purpose? Argue for or against.',
    'Essay',
    'Some people argue that zoos are cruel and should be closed down, while others believe they play an important role in conservation and education.

To what extent do you agree or disagree that zoos should be closed?',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-00000000000d',
    'Advertising Aimed at Children',
    'Two-part question on media and regulation. Both questions carry equal weight, and answering only one caps the task response band.',
    'Why does advertising target children, and should it be controlled?',
    'Essay',
    'A great deal of advertising is aimed directly at children.

Why do companies do this, and do you think advertising to children should be restricted?',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-00000000000e',
    'English as a Global Language',
    'Advantages-outweigh-disadvantages essay on language and culture. Tests genuine weighing rather than a list of pros then a list of cons.',
    'English is spoken almost everywhere. Do the advantages outweigh the disadvantages?',
    'Essay',
    'English is used more and more as a common language for business, science and travel around the world.

Do the advantages of having one global language outweigh the disadvantages?',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-00000000000f',
    'Punishment or Rehabilitation',
    'Discuss-both-views essay on criminal justice. Requires a clear own opinion in addition to covering both positions.',
    'Should offenders face longer sentences or education and training? Discuss both views.',
    'Essay',
    'Some people believe that the best way to reduce crime is to give longer prison sentences, while others think that education and job training for offenders would be more effective.

Discuss both these views and give your own opinion.',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-000000000010',
    'Single-Use Plastic',
    'Problem and solution essay on the environment. Tests whether proposed measures are specific enough to be credible.',
    'Single-use plastic is a growing problem. What is causing it, and what should be done?',
    'Essay',
    'Huge quantities of single-use plastic are produced and thrown away every year, and much of it ends up in the natural environment.

What are the causes of this problem, and what measures could governments and individuals take to address it?',
    40, 250, 'Task2', 'Academic', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-000000000011',
    'Studying Abroad',
    'Advantages-outweigh-disadvantages essay on education. A common General Training topic that rewards concrete personal and social examples.',
    'More students study in another country. Do the advantages outweigh the disadvantages?',
    'Essay',
    'An increasing number of students choose to complete part of their education in a foreign country.

Do the advantages of studying abroad outweigh the disadvantages?',
    40, 250, 'Task2', 'General', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-000000000012',
    'Family Time and Modern Life',
    'Two-part question on social change. Both halves need development, and the second half should follow from the first.',
    'Families spend less time together than they used to. Why, and what can be done?',
    'Essay',
    'In many families today, members spend less time together than they did in the past.

Why is this happening, and what could be done to encourage families to spend more time together?',
    40, 250, 'Task2', 'General', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-000000000013',
    'Local or International Charity',
    'Discuss-both-views essay on giving. Tests even-handed treatment before the writer commits to a view.',
    'Should people help their local community first, or give to causes abroad? Discuss both views.',
    'Essay',
    'Some people think that money given to charity should go to causes in the local community, while others believe it should go where the need is greatest anywhere in the world.

Discuss both these views and give your own opinion.',
    40, 250, 'Task2', 'General', NULL, NULL, true, false
),
(
    '22222222-2222-4222-8222-000000000014',
    'Shopping as a Leisure Activity',
    'Agree/disagree opinion essay on consumer culture. Tests holding a position on a topic where candidates often drift into neutral description.',
    'Shopping has become a hobby for many people. Is this a positive or negative development?',
    'Essay',
    'In many countries, shopping has become a popular leisure activity rather than something people do only when they need something.

Is this a positive or a negative development?',
    40, 250, 'Task2', 'General', NULL, NULL, true, false
)

ON CONFLICT ("WritingPromptId") DO UPDATE SET
    "Topic"            = EXCLUDED."Topic",
    "Description"      = EXCLUDED."Description",
    "Preview"          = EXCLUDED."Preview",
    "QuestionType"     = EXCLUDED."QuestionType",
    "QuestionText"     = EXCLUDED."QuestionText",
    "Duration"         = EXCLUDED."Duration",
    "MinimumWords"     = EXCLUDED."MinimumWords",
    "TaskType"         = EXCLUDED."TaskType",
    "Level"            = EXCLUDED."Level",
    "ImageUrl"         = EXCLUDED."ImageUrl",
    "ImageDescription" = EXCLUDED."ImageDescription",
    "UpdatedAt"        = NOW();

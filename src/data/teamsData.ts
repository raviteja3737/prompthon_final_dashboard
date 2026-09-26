import { Team, Evaluation } from '../types';

export const INITIAL_TEAMS: Team[] = [
  {
    "id": "team-001",
    "name": "The Phantom Troop",
    "members": "Varshith Vadugula, Sameer Shukla, Yesu Raju, Rajesh khanna",
    "tag": "AIML"
  },
  {
    "id": "team-002",
    "name": "Binary Brains",
    "members": "Niharika Dudyala, Manaswini Bomma, Sowmitha Gogu, Geethika Maddila",
    "tag": "Open Innovation"
  },
  {
    "id": "team-003",
    "name": "Hackspheres",
    "members": "Supraja Thantanapally, Bhargavi, Navya, Gayatri",
    "tag": "Open Innovation"
  },
  {
    "id": "team-004",
    "name": "MB",
    "members": "B. Meghana, Jampani Bhavya sree",
    "tag": "Open Innovation"
  },
  {
    "id": "team-005",
    "name": "Code X",
    "members": "Ramagiri Vinay Kumar, Rajoli Sri kanth, Medi Smaran Madhav, Shivarathri Ram charan",
    "tag": "Open Innovation"
  },
  {
    "id": "team-006",
    "name": "Ram Sethu",
    "members": "S.prashanth Kumar, Siddharth saode, S.karthik, P.shiva",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-007",
    "name": "KF",
    "members": "Raj Jaiswar, Manav Rajpurohit, Mohd. Hazique Sayed",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-008",
    "name": "Civic Saathi",
    "members": "Kotha Akash, Himashu kumar singh, Sabbithi sneha",
    "tag": "AIML"
  },
  {
    "id": "team-009",
    "name": "Deepak Reddy",
    "members": "K Deepak Reddy, Revanth Kalyanam, K sravanthi",
    "tag": "AIML"
  },
  {
    "id": "team-010",
    "name": "Upss",
    "members": "Sathvika ballepu, Pavani burroju, Ch.sriram, G.uttham",
    "tag": "Open Innovation"
  },
  {
    "id": "team-011",
    "name": "GigGurus",
    "members": "Shaik Faizan Ahmed, Punna Gurunanda, Harivallabha Sai Surishetty, Banala Vikas Rao",
    "tag": "AIML"
  },
  {
    "id": "team-012",
    "name": "KLR",
    "members": "Nimmala Karthik, Challa Laxman",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-013",
    "name": "PromptVerse",
    "members": "Singireddy Varun Sandhesh Reddy, Pulijala Sai Srikar, Mohammed Misbahuddin, Katta rohith",
    "tag": "Open Innovation"
  },
  {
    "id": "team-014",
    "name": "VYRO",
    "members": "G Praneeth Kumar, J Bhavani shetty, A Sai Ruthvik",
    "tag": "Open Innovation"
  },
  {
    "id": "team-015",
    "name": "Delulu devopers",
    "members": "P Shanmukha Teja Reddy, Mohammed Zubair, Syed Asrar, Sayeed bin Hasan",
    "tag": "Open Innovation"
  },
  {
    "id": "team-016",
    "name": "V . Manideepika",
    "members": "Vanagani Manideepika, V. Akhil, P. Shailaja",
    "tag": "Open Innovation"
  },
  {
    "id": "team-017",
    "name": "Astral Code",
    "members": "Adithya Shankar, Rahul Bala Amith M, Vignesh Kumar, Harish V",
    "tag": "AIML"
  },
  {
    "id": "team-018",
    "name": "ThinkBot",
    "members": "Surampudi Divya Sri Aparna, Malla Hema Atchuta, Tamalampudi Jeevana Lahari Priya",
    "tag": "Open Innovation"
  },
  {
    "id": "team-019",
    "name": "Project Paradox",
    "members": "Dhurjeti Pratap sharma, Nimmakayala Venkata Jayasimha, GATHPA KARTHIK REDDY",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-020",
    "name": "Cyber Warriors",
    "members": "Navaneeth Kumar Anantha, Shaik Junaid Pasha",
    "tag": "Open Innovation"
  },
  {
    "id": "team-021",
    "name": "Team cyber",
    "members": "Cheemarla Harshitha, Kaitha Bindu sri, Undyala Varshitha",
    "tag": "Open Innovation"
  },
  {
    "id": "team-022",
    "name": "Brilliant Minds Wizards",
    "members": "NETI HOSHINI SAI SRI VAISHNAVI, Pravalika Chadaram, AVINASH DONDAPATI",
    "tag": "Open Innovation"
  },
  {
    "id": "team-023",
    "name": "TRIFORGE",
    "members": "Siddardha Kumar Yalakala, Valavala Navya Sri Padmini, Kolla sai durga praveen",
    "tag": "Open Innovation"
  },
  {
    "id": "team-024",
    "name": "Commit & pray",
    "members": "Mrudula, Priya varshini, MD Umeir Aliyaan",
    "tag": "Open Innovation"
  },
  {
    "id": "team-025",
    "name": "Spark",
    "members": "Pasupuleti Bhuvaneswari, Jyoshna nammi",
    "tag": "AIML"
  },
  {
    "id": "team-026",
    "name": "innov8",
    "members": "Aditya raj, Aarohi, kanishka Rana, Anu Mahto",
    "tag": "AIML"
  },
  {
    "id": "team-027",
    "name": "Code Nexus",
    "members": "Gali Leela Prashanth, Yarramsetti Yugandhar Ramsai, Akula Hanuman Saitej, Dasari johith pavan kumar",
    "tag": "Open Innovation"
  },
  {
    "id": "team-028",
    "name": "Apex Inovators",
    "members": "AKULA SUMUKESH RAJ GUPTA, Charla charan kumar, Anreddy sarvajith reddy",
    "tag": "Open Innovation"
  },
  {
    "id": "team-029",
    "name": "Team Arise",
    "members": "C RAGHAVENDRA, DHOLKA YESHWANTH, AKULA CHINNARI, GADDAM JYOTHI",
    "tag": "Open Innovation"
  },
  {
    "id": "team-030",
    "name": "NEXORA",
    "members": "SIDHARTH AGARWAL, SHAIK FAZEELATH ZAHEER, VENKATESH RAVOORI, RAJESHWAR YASANI",
    "tag": "Open Innovation"
  },
  {
    "id": "team-031",
    "name": "VASUDEV",
    "members": "Amalla Shwithan Reddy, D.Aryan, A.Abhishek, Vemunuri Aashritha",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-032",
    "name": "Code Titans",
    "members": "Kolukuluri Teja Naga Sai Ganesh, Kaila Tarun Nagendra, Buddaraju Lokesh Anjaneya Varma, Adabala Sumanth Venkata Satya Sai Pavan",
    "tag": "Open Innovation"
  },
  {
    "id": "team-033",
    "name": "Cogniva",
    "members": "Kotana Hyswika, Tangeti Maneesha, Koyya Veera Vaishnavi, Vakapalli Manasi Reshmi",
    "tag": "Open Innovation"
  },
  {
    "id": "team-034",
    "name": "Nexus",
    "members": "E Rohith Kumar, A.Anjaneyulu, Sai Chandana, D Joshnavi",
    "tag": "Open Innovation"
  },
  {
    "id": "team-035",
    "name": "Aivora",
    "members": "Pitta Divya malathi, komati Deepika, Madimani Durga tanuja, Veluduti Hasini",
    "tag": "Open Innovation"
  },
  {
    "id": "team-036",
    "name": "404 founders",
    "members": "P. Vijaya hasini, P. Mamatha, B. Himesh babu",
    "tag": "AIML"
  },
  {
    "id": "team-037",
    "name": "TEAM NOVA",
    "members": "MORTHAD BALASHUBAM, PILLI HARSHAVARDHAN, M. KIRANPRASAD, PILLI PRANITH KUMAR",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-038",
    "name": "Avengers!! Assemble",
    "members": "Kandkoor Nidhi reddy, K. Bhavya sri, Sri vyshnavi",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-039",
    "name": "Vihanga",
    "members": "Kankati pavani, Katge Vidisha, kethavath rahul, kethavath ramesh",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-040",
    "name": "Next Gen innovation",
    "members": "K.Tabitha, K.Tapaswi, K.Sandeep Chary, G.Raghavendar",
    "tag": "Open Innovation"
  },
  {
    "id": "team-041",
    "name": "SRI ASTRA",
    "members": "Vallepu Shivaji, Marii ruthbik",
    "tag": "Open Innovation"
  },
  {
    "id": "team-042",
    "name": "CodeCrafters",
    "members": "Kondareddy Shireesha, Konatham chandana, Nedur Madhumitha, Naidu Pranitha",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-043",
    "name": "Cloud9",
    "members": "Hemanth Kumar Narasingoju, Palleboina Shankar, Lokesh Kandukuri, Rajula Jyothika",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-044",
    "name": "HASH\u00b2",
    "members": "N. Harshitha, P. Harika",
    "tag": "AIML"
  },
  {
    "id": "team-045",
    "name": "Bytex",
    "members": "Pitta Manasa, Shreya, Thrinesh",
    "tag": "Open Innovation"
  },
  {
    "id": "team-046",
    "name": "NEXUS-where ideas become innovation",
    "members": "yashwanth singh, laxman, AVNIET INSTITUTE OF TECHNOLOGY",
    "tag": "Open Innovation"
  },
  {
    "id": "team-047",
    "name": "Loop4",
    "members": "Kusha deepika, Shiva Shankar gt, Raju Guniganti, Durgaprasad kemidi",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-048",
    "name": "001",
    "members": "Snigdha Reddy, Kishan Rathod, Thrishula Pani, Charan Teja",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-049",
    "name": "Codix",
    "members": "N Akshitha, M.Pratiksha, P.Manaswini, P.Charishma",
    "tag": "Open Innovation"
  },
  {
    "id": "team-050",
    "name": "HackHerz",
    "members": "Divya Mahankali, Niharika Marthala, Amulya Pendli",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-051",
    "name": "THE ZS\u00b3",
    "members": "Sanvi Sharma, Soha Fathima Thuraab, Zoya Mahveen, G. Sangeetha Reddy",
    "tag": "Open Innovation"
  },
  {
    "id": "team-052",
    "name": "VIHAN GANG",
    "members": "Bokka vihan reddy, Shayan mohammed, Vishal simha, Lakshmi praneet",
    "tag": "AIML"
  },
  {
    "id": "team-053",
    "name": "Geetla Anudeep Reddy",
    "members": "Geetla Anudeep Reddy, Ravikanti Bharath Kumar, Polakonda Karthikeya, Kolli Om Pratham",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-054",
    "name": "Error-404",
    "members": "P.Sai Sushanth, Parvath Reddy Patil, Suraj Daggu, R.Kiran teja",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-055",
    "name": "Neuro Forge",
    "members": "Pranay Reddy, Abdur Rahman Umair, Tejaswini, Pavani",
    "tag": "Open Innovation"
  },
  {
    "id": "team-056",
    "name": "OOPsies",
    "members": "Bomma Shiva Mani, Bashamoni Sri Charan, Akula Akshaya, Boddu Niveditha",
    "tag": "Open Innovation"
  },
  {
    "id": "team-057",
    "name": "Code Blooded",
    "members": "Abhinav Prabhakar, Abhishek Thodupunoori, Sudheer Jillellamudi, Suchith Koduru",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-058",
    "name": "Ogcoders",
    "members": "A.Hemsurya, Gangireddy.sreehitha, Lakshmi bhargavi, Kukunuru abhinav",
    "tag": "Open Innovation"
  },
  {
    "id": "team-059",
    "name": "Nova Sparks",
    "members": "Thanmai, N.Gayathri, T.Srilaxmi, Y.Tejasri",
    "tag": "Open Innovation"
  },
  {
    "id": "team-060",
    "name": "TeamTech",
    "members": "Anthagiri Kiran, G. Meenakshi, A. Pooja",
    "tag": "Open Innovation"
  },
  {
    "id": "team-061",
    "name": "nunejayanthiavn@gmail.com",
    "members": "Nune jayanthi, Bangari shireesha",
    "tag": "Open Innovation"
  },
  {
    "id": "team-062",
    "name": "New Coderzzz",
    "members": "bharath s, Naazil ahamed E, Praveen Kumar G, Divya dharshan S",
    "tag": "AIML"
  },
  {
    "id": "team-063",
    "name": "TechRisers",
    "members": "K.Vineel kumar, M.Nikhil, Muddam Gagana sri, Kema Harika",
    "tag": "Open Innovation"
  },
  {
    "id": "team-064",
    "name": "Apex coderS",
    "members": "Sai Anjan Kumar T, Shaik Suhana",
    "tag": "AIML"
  },
  {
    "id": "team-065",
    "name": "NEURAFORGE",
    "members": "Pavan Penugurthi, Revanth Tarun Challapalli, JAHNAVI SAI SARANYA REDDY, Jakkamsetti Omkar Kumar",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-066",
    "name": "Infinity Crew",
    "members": "Kishor S, Lakshana S, Midhuna R, Lalitha SV",
    "tag": "AIML"
  },
  {
    "id": "team-067",
    "name": "Code Code",
    "members": "Laxmi Sanjana Nomula, Rohitha Barukula",
    "tag": "Open Innovation"
  },
  {
    "id": "team-068",
    "name": "Code pirates",
    "members": "Yakshith Bodike, Jillaa ManiKanta",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-069",
    "name": "PROMPT FORGE",
    "members": "Yalagala.Adhi laxmi, P.Varsha shri, Mohammad.Althaf",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-070",
    "name": "Team Ignite",
    "members": "Jatin Sanjay Jadhav, Pruthvi Kumar Mohite, Yashraj Sundar Khose",
    "tag": "Open Innovation"
  },
  {
    "id": "team-071",
    "name": "Team Omega",
    "members": "Rakshitha E, Rachana H Raj, R Chinmai Gowda, Punith Gowda B K",
    "tag": "AIML"
  },
  {
    "id": "team-072",
    "name": "Team Saathi",
    "members": "H.Rajesh Kumar, Y.Kavya Sri, B.Nandu",
    "tag": "Open Innovation"
  },
  {
    "id": "team-073",
    "name": "VisionX",
    "members": "PUNNAM LAKSHMI BHAVANI KARTHIKEYA, PONNAPALLI SHANMUKHA SITARAMAIAH, MOHAMMAD ABDUL ALIJAN, CHILAKANTI DURGA RAM SIDDESH",
    "tag": "Open Innovation"
  },
  {
    "id": "team-074",
    "name": "Prism",
    "members": "Vuppuluri Venkata Lalith Kartheek, Dudekula Hazra Bee, Rimsha, Konyala Dinesh Chary",
    "tag": "AIML"
  },
  {
    "id": "team-075",
    "name": "DELULU",
    "members": "Pulloju Santhosh, Gadaguti Lokesh, Dhanush",
    "tag": "Open Innovation"
  },
  {
    "id": "team-076",
    "name": "VIRANARI",
    "members": "Anvishree Nerlekar, Divya Deepika Thodati, Pavitra Roshna Reddy, Chintalcheruvu Sri Harsha",
    "tag": "Open Innovation"
  },
  {
    "id": "team-077",
    "name": "QuickSortX",
    "members": "PALLA MONIKA PRIYA, Muppireddy Nayanesh Reddy, Kuncha Harshitha, Shreekrithi bashaboina",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-078",
    "name": "Jai Dev",
    "members": "Amith Bhambhu, M Akhil, Harshith Varma Penmetsa",
    "tag": "AIML"
  },
  {
    "id": "team-079",
    "name": "Pegasus",
    "members": "lakna nitish, Erri Pradeep, Bhushanaveni Navadeep",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-080",
    "name": "Maruthi",
    "members": "sudheer kenche, laxmi narsimha, Shankar Kalyanam",
    "tag": "Open Innovation"
  },
  {
    "id": "team-081",
    "name": "KGF",
    "members": "V.Pavan naik, K.Shiva shankar",
    "tag": "Open Innovation"
  },
  {
    "id": "team-082",
    "name": "TEAM FOURCAST",
    "members": "Krish Sureja, M. Yashwant raj, Peddiraju Anuradha Nandini, Chakrika Panakala",
    "tag": "Open Innovation"
  },
  {
    "id": "team-083",
    "name": "NeuroShield",
    "members": "Surya Sashank Devarabhotla, NAVYA CHARITHA KAKI, Kurmadasu Vaishnavi, Veeramachaneni Niharika",
    "tag": "AIML"
  },
  {
    "id": "team-084",
    "name": "SWAPANTH& MANOJ",
    "members": "AKARAPU SWAPANTH KUMAR, CHODAGIRI MANOJ",
    "tag": "AIML"
  },
  {
    "id": "team-085",
    "name": "Code ninjas",
    "members": "Gayam Jashwanth Reddy, Sania Thasneem, K pallavi",
    "tag": "Open Innovation"
  },
  {
    "id": "team-086",
    "name": "Quantum Minds",
    "members": "Merugu Revathi, Dasari Ankitha, Jagiri sriram",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-087",
    "name": "Prompt Pulse",
    "members": "Thrishal yeggoni, Yeggoni sai Pranavi, Sunkari sai ruthik",
    "tag": "Open Innovation"
  },
  {
    "id": "team-088",
    "name": "Naira",
    "members": "Palagiri Vishnu Teja, Eftekharul Mullick, Ganjikuntla Deepika, Upputuri Bindu Abhi Sathvika",
    "tag": "AIML"
  },
  {
    "id": "team-089",
    "name": "FarmX",
    "members": "Kanneti Dinesh, K. Dinesh, K. N. V. Vasuja",
    "tag": "AIML"
  },
  {
    "id": "team-090",
    "name": "VRS\u00b2 ByteBrew",
    "members": "Gurram Srivally, Kaduru Varshini, Jampula Sindhuja, Kuvvarapu Rishika Roshini",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-091",
    "name": "The matrix",
    "members": "Kumar Raja, Puppala pavani sudha, Thulasi, Reddy Mounika",
    "tag": "Open Innovation"
  },
  {
    "id": "team-092",
    "name": "Ninja Logic",
    "members": "Kashif Kalimoddin Patel, Arsheen Fatema Ismail Sayyed, Shaikh Salik SK Sajeed, Rekha Tryambak Swami",
    "tag": "AIML"
  },
  {
    "id": "team-093",
    "name": "Team Synapian",
    "members": "Sayyad Sameer Hussain, Sadik Salam Gonarkar, Vaidya priya shripati, Prashik Kiran Bhusawale",
    "tag": "AIML"
  },
  {
    "id": "team-094",
    "name": "Royal",
    "members": "Rehan bin esa, Shahid Afrath, Mohd Nawaz",
    "tag": "Open Innovation"
  },
  {
    "id": "team-095",
    "name": "Mind Spark",
    "members": "Siddireddy lakshmi Pranathi, Pratti Pravalika, R Siddhartha",
    "tag": "AIML"
  },
  {
    "id": "team-096",
    "name": "Seragadam gowtham",
    "members": "Seragadam gowtham, Kadi naga ramya, K namrutha",
    "tag": "AIML"
  },
  {
    "id": "team-097",
    "name": "Codesmiths",
    "members": "Eshan Mohammed Shaik, Siddharth Bokka, Manaswini Madiraju",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-098",
    "name": "HACK SMITHS",
    "members": "Hansika Ramaram, Aishwarya Likki, Sai Pranav Prakhya",
    "tag": "LLMs & Automations"
  },
  {
    "id": "team-099",
    "name": "Cospark",
    "members": "Abhishiek samuel, Drv aryan, Anthony",
    "tag": "AIML"
  },
  {
    "id": "team-100",
    "name": "Batchmates",
    "members": "Teja Sree Chandrika, Sahithi, Aksritha",
    "tag": "AIML"
  }
];

export const INITIAL_EVALUATIONS: Evaluation[] = [];

import type { Player, Role, SetCategory } from "./types";

type Row = [string, SetCategory, Role, boolean, number, number];

// [name, set, role, overseas, basePrice(L), rating]
const ROWS: Row[] = [
  // MARQUEE
  ["Virat Kohli", "MARQUEE", "BAT", false, 200, 94],
  ["Rohit Sharma", "MARQUEE", "BAT", false, 200, 91],
  ["Jasprit Bumrah", "MARQUEE", "FAST", false, 200, 96],
  ["Rashid Khan", "MARQUEE", "SPIN", true, 200, 93],
  ["Jos Buttler", "MARQUEE", "WK", true, 200, 90],
  ["Hardik Pandya", "MARQUEE", "AR", false, 200, 90],
  ["Pat Cummins", "MARQUEE", "FAST", true, 200, 89],
  ["Ravindra Jadeja", "MARQUEE", "AR", false, 200, 88],

  // CAPPED BAT
  ["Shubman Gill", "CAPPED_BAT", "BAT", false, 150, 87],
  ["Suryakumar Yadav", "CAPPED_BAT", "BAT", false, 150, 89],
  ["Shreyas Iyer", "CAPPED_BAT", "BAT", false, 150, 82],
  ["Travis Head", "CAPPED_BAT", "BAT", true, 150, 86],
  ["David Warner", "CAPPED_BAT", "BAT", true, 150, 80],
  ["Faf du Plessis", "CAPPED_BAT", "BAT", true, 100, 76],
  ["Yashasvi Jaiswal", "CAPPED_BAT", "BAT", false, 150, 85],

  // CAPPED AR
  ["Axar Patel", "CAPPED_AR", "AR", false, 100, 80],
  ["Washington Sundar", "CAPPED_AR", "AR", false, 75, 74],
  ["Glenn Maxwell", "CAPPED_AR", "AR", true, 150, 82],
  ["Marcus Stoinis", "CAPPED_AR", "AR", true, 100, 77],
  ["Sam Curran", "CAPPED_AR", "AR", true, 100, 78],
  ["Shivam Dube", "CAPPED_AR", "AR", false, 75, 75],

  // CAPPED FAST
  ["Mohammed Shami", "CAPPED_FAST", "FAST", false, 150, 85],
  ["Mohammed Siraj", "CAPPED_FAST", "FAST", false, 150, 83],
  ["Arshdeep Singh", "CAPPED_FAST", "FAST", false, 100, 81],
  ["Trent Boult", "CAPPED_FAST", "FAST", true, 150, 84],
  ["Mitchell Starc", "CAPPED_FAST", "FAST", true, 150, 83],
  ["Kagiso Rabada", "CAPPED_FAST", "FAST", true, 150, 84],
  ["Deepak Chahar", "CAPPED_FAST", "FAST", false, 100, 74],

  // CAPPED SPIN
  ["Yuzvendra Chahal", "CAPPED_SPIN", "SPIN", false, 100, 82],
  ["Kuldeep Yadav", "CAPPED_SPIN", "SPIN", false, 100, 84],
  ["Ravichandran Ashwin", "CAPPED_SPIN", "SPIN", false, 100, 79],
  ["Sunil Narine", "CAPPED_SPIN", "SPIN", true, 150, 85],
  ["Adam Zampa", "CAPPED_SPIN", "SPIN", true, 100, 75],
  ["Varun Chakravarthy", "CAPPED_SPIN", "SPIN", false, 75, 78],

  // CAPPED WK
  ["Rishabh Pant", "CAPPED_WK", "WK", false, 200, 89],
  ["KL Rahul", "CAPPED_WK", "WK", false, 150, 86],
  ["Sanju Samson", "CAPPED_WK", "WK", false, 150, 84],
  ["Ishan Kishan", "CAPPED_WK", "WK", false, 100, 78],
  ["Quinton de Kock", "CAPPED_WK", "WK", true, 150, 83],
  ["Heinrich Klaasen", "CAPPED_WK", "WK", true, 150, 87],

  // UNCAPPED BAT
  ["Ayush Badoni", "UNCAPPED_BAT", "BAT", false, 30, 66],
  ["Nehal Wadhera", "UNCAPPED_BAT", "BAT", false, 30, 64],
  ["Sameer Rizvi", "UNCAPPED_BAT", "BAT", false, 30, 62],
  ["Angkrish Raghuvanshi", "UNCAPPED_BAT", "BAT", false, 30, 65],
  ["Priyansh Arya", "UNCAPPED_BAT", "BAT", false, 30, 63],
  ["Dewald Brevis", "UNCAPPED_BAT", "BAT", true, 40, 68],

  // UNCAPPED AR
  ["Abdul Samad", "UNCAPPED_AR", "AR", false, 30, 61],
  ["Naman Dhir", "UNCAPPED_AR", "AR", false, 30, 63],
  ["Nitish Reddy", "UNCAPPED_AR", "AR", false, 30, 69],
  ["Shahrukh Khan", "UNCAPPED_AR", "AR", false, 30, 60],
  ["Vijay Shankar", "UNCAPPED_AR", "AR", false, 20, 56],

  // UNCAPPED FAST
  ["Harshit Rana", "UNCAPPED_FAST", "FAST", false, 30, 68],
  ["Mayank Yadav", "UNCAPPED_FAST", "FAST", false, 30, 70],
  ["Akash Madhwal", "UNCAPPED_FAST", "FAST", false, 20, 58],
  ["Yash Dayal", "UNCAPPED_FAST", "FAST", false, 30, 64],
  ["Tushar Deshpande", "UNCAPPED_FAST", "FAST", false, 30, 62],
  ["Vaibhav Arora", "UNCAPPED_FAST", "FAST", false, 20, 59],

  // UNCAPPED SPIN
  ["Ravi Bishnoi", "UNCAPPED_SPIN", "SPIN", false, 40, 72],
  ["Suyash Sharma", "UNCAPPED_SPIN", "SPIN", false, 30, 63],
  ["Manav Suthar", "UNCAPPED_SPIN", "SPIN", false, 20, 55],
  ["Karn Sharma", "UNCAPPED_SPIN", "SPIN", false, 20, 52],
  ["Himanshu Sharma", "UNCAPPED_SPIN", "SPIN", false, 20, 54],

  // UNCAPPED WK
  ["Abhishek Porel", "UNCAPPED_WK", "WK", false, 30, 65],
  ["Dhruv Jurel", "UNCAPPED_WK", "WK", false, 40, 70],
  ["Jitesh Sharma", "UNCAPPED_WK", "WK", false, 30, 64],
  ["Anuj Rawat", "UNCAPPED_WK", "WK", false, 20, 57],
];

export function buildSamplePlayers(): Player[] {
  return ROWS.map(([name, set, role, overseas, basePrice, rating], i) => ({
    id: `s${String(i + 1).padStart(3, "0")}`,
    name,
    set,
    role,
    overseas,
    basePrice,
    rating,
  }));
}

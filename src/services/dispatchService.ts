import db from '../db/connect.js';
import { ATM, Engineer, Ticket } from '../types/schema.js';
import haversine from 'haversine-distance'
import * as ort from 'onnxruntime-node';


/**
 * @desc    Mock AI dispatch logic to assign the nearest available engineer.
 * @param   atmId The ID of the faulty ATM
 * @param   issueType The type of issue (e.g., 'cash_dispenser_fault')
 * @returns The newly created and assigned ticket
 */
export const assignNearestEngineer = async (ticketId: string, atmId: string, issueType: string) => {
  let id_;
  let atm;
    try{
  const session = await ort.InferenceSession.create('src/predictors/xgboost_regressor.onnx');
  const outputName = session.outputNames[0];
  const inputName = session.inputNames[0];

  // --- 1. Get ATM details (we need its city) ---
  const atmStmt = db.prepare('SELECT * FROM ATMs WHERE id = ?');
  atm = atmStmt.get(atmId) as ATM | undefined;

  const tcktStmt = db.prepare('SELECT * FROM Tickets WHERE id = ?');
  const ticket = tcktStmt.get(ticketId) as Ticket | undefined;

  if (!ticket) {
    throw new Error('Ticket not found');
  }
  if (!atm) {
    throw new Error('ATM not found');
  }
  atm.location = JSON.parse(atm.location.toString())
  // --- 2. Find an "available" engineer in the same city ---
  // Our mock logic is simple: find *any* engineer in the same region.
  // A real app would check skills, availability, workload, etc.
  const stmt = db.prepare('SELECT * FROM Engineers');
  const engineers = stmt.all() as Engineer[];
  
  let issue: String;
  if(['CARD_JAM', 'HARDWARE', 'SCREEN_FAILURE', 'OTHER'].includes(issueType)){
     issue = 'HARDWARE'
  }
  else if(issueType == 'POWER_ISSUE'){
     issue = 'POWER';
  }
  else if(issueType == 'NETWORK_FAILURE'){
     issue = 'NETWORK';
  }
  else{
     issue = 'SOFTWARE';
  }
  const atmLocation = {latitude: atm.location.coordinates.lat, longitude:atm.location.coordinates.lng};

  const sevMap: Record<string, number> = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 3,
  };

  const scores = engineers.map(async function(engineer){

    const skill_match = engineer.specialization.includes(issue as any)? 1 : 0;

    const engLoc = engineer.lastKnownLocation
        ? {
            latitude: engineer.lastKnownLocation.lat,
            longitude: engineer.lastKnownLocation.lng,
          }
        : {
            latitude: Math.random() * 500,
            longitude: Math.random() * 500,
          };


    const distance = haversine(atmLocation, engLoc);

    const review_score = 4.0;
    const sev = ticket.severity || 'MEDIUM'
    const severity =  sevMap[sev];
    const tensor = new ort.Tensor('float32', Float32Array.from([skill_match, distance, review_score, severity]), [1, 4]) ;

    const input = { [inputName]: tensor};
    const output = await session.run(input);

    const predictionTensor = output[outputName];

    // The actual value(s)
    const predictionValue = predictionTensor.data;

    return [engineer.id, predictionValue[0]]
  })


  const resolvedScores = await Promise.all(scores);
  console.log(resolvedScores);

  let id = "";
  let highest = 0;
  for (const [engineerId, rawScore] of resolvedScores){
    
    const scoreValue = Number(rawScore);
    const engineerId_ = String(engineerId)

    if(scoreValue > highest){
      id_ = engineerId_;
      highest = scoreValue;
    }
  }}catch(err){
    console.log("model failed:", err);
    const num = Math.floor(Math.random()*12);
    const engStmt = db.prepare('SELECT * FROM Engineers LIMIT 1 OFFSET ?');
    const engineer = engStmt.get(num) as Engineer | undefined;
    id_  = engineer? engineer.id : 0;
  }

  
  console.log(id_);
  const engineerStmt = db.prepare('SELECT * FROM Engineers WHERE id = ? LIMIT 1');
  const engineer = engineerStmt.get(String(id_)) as Engineer | undefined;

  if (!engineer) {
    // No engineer found in that city. Create an 'open' ticket.
    console.log("creating ticket");
    const openTicketStmt = db.prepare(
      'INSERT INTO Tickets (atmId, issueType, status, engineerId) VALUES (?, ?, ?, ?)'
    );
    const info = openTicketStmt.run(atmId, issueType, 'open', null);
    
    return {
      id: info.lastInsertRowid,
      atmId: atmId,
      engineerId: null,
      status: 'open',
      message: 'Fault logged. No engineer available in city, ticket set to open.'
    };
  }

  // --- 3. Engineer Found: Create Ticket & Assign it ---
  const assignedTicketStmt = db.prepare(
    'UPDATE Tickets SET engineerId = ?, status = ?  WHERE id = ?'
  );
  const info = assignedTicketStmt.run(engineer.id, 'assigned', ticketId);

  console.log(`Dispatched Engineer ${engineer.name} (ID: ${engineer.id}) to ATM ${atm?.id} in ${atm?.location.region}`);

  // --- 4. Return the new ticket ---
  return {
    id: info.lastInsertRowid,
    atmId: atmId,
    engineerId: engineer.id,
    status: 'assigned',
    message: `Successfully assigned Engineer ${engineer.name}`
  };
};
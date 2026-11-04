import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { processLesson } from "../src/lib/ai";

async function main() {
  console.log("=== PROCESSING MULTIMEDIA & CLINICAL AUDIO/VIDEO LESSONS ===");

  // 1. GIT (Sem 7 > 1.4r7 Videos)
  const gitLesson = await prisma.lesson.findUnique({
    where: { id: "cmv6qxwng00cijp06fnztker1" },
    include: { files: true },
  });
  if (gitLesson) {
    console.log(`\nPreparing content for ${gitLesson.title}...`);
    const sourceLessons = await prisma.lesson.findMany({
      where: {
        subject: { title: "2.Med 3" },
        title: {
          in: [
            "2.Liver cirrhosis",
            "3.Jaundice & ALF",
            "4.Metabolic fatty & Auto immune",
            "5.IBS & non-infectious diarrhea",
          ],
        },
      },
      select: { title: true, summary: true },
    });
    const combinedSource = sourceLessons
      .map((l) => `\n\n=== SECTION: ${l.title} ===\n${l.summary}`)
      .join("\n");
    const filesList = gitLesson.files.map((f) => `- ${f.title}`).join("\n");

    const richContext = `Gastroenterology and Hepatology Core Curriculum covering:
${filesList}

Core Medical Knowledge & Clinical Pathophysiology:
${combinedSource}

High-Yield Topics to Cover:
1. Liver Cirrhosis: etiology, Child-Pugh and MELD classification, portal hypertension, esophageal varices management (banding, non-selective beta-blockers, octreotide), ascites management (spironolactone + furosemide, paracentesis), Spontaneous Bacterial Peritonitis (SBP criteria: PMN > 250, ceftriaxone, albumin infusion), Hepatic Encephalopathy (grading, lactulose, rifaximin), Hepatorenal syndrome (HRS type 1 vs 2).
2. Autoimmune & Metabolic Liver Diseases: Autoimmune hepatitis (ANA, ASMA, IgG, steroid response), Non-Alcoholic Fatty Liver Disease (NAFLD/NASH, metabolic syndrome, lifestyle + GLP-1/pioglitazone), Wilson disease (ATP7B mutation, copper overload, Kayser-Fleischer rings, low ceruloplasmin, penicillamine/trientine), Hemochromatosis (HFE gene C282Y, bronze diabetes, phlebotomy).
3. Jaundice & Acute Liver Failure (ALF): Differential diagnosis of pre-hepatic (hemolytic), intra-hepatic (hepatocellular), and post-hepatic (cholestatic/obstructive) jaundice. ALF criteria (coagulopathy INR > 1.5 and encephalopathy within 26 weeks in patient without prior cirrhosis), Kings College criteria for liver transplant, N-acetylcysteine for acetaminophen toxicity.
4. Diarrhea & Irritable Bowel Syndrome (IBS): Rome IV criteria for IBS (IBS-C, IBS-D, IBS-M), alarm features requiring colonoscopy, malabsorption vs secretory vs osmotic diarrhea.`;

    console.log(`Processing ${gitLesson.title} with processLesson...`);
    await processLesson(gitLesson.id, richContext);
    console.log(`Completed ${gitLesson.title}!`);
  }

  // 2. Rheumatoid (Sem 7 > 1.4r7 Videos)
  const rheumLesson = await prisma.lesson.findUnique({
    where: { id: "cmv6r24o500csjk06rz6zohz3" },
    include: { files: true },
  });
  if (rheumLesson) {
    console.log(`\nPreparing content for ${rheumLesson.title}...`);
    const sourceLesson = await prisma.lesson.findFirst({
      where: { subject: { title: "3.Med 4" }, title: "Rheumatoid" },
      select: { title: true, summary: true },
    });
    const filesList = rheumLesson.files.map((f) => `- ${f.title}`).join("\n");
    const richContext = `Rheumatology Core Curriculum: Rheumatoid Arthritis and Inflammatory Arthropathies:
Lecture and Seminar Modules:
${filesList}

Core Medical Knowledge:
${sourceLesson?.summary || ""}

High-Yield Topics:
1. Pathophysiology: Autoimmune chronic inflammatory synovitis, symmetric polyarthritis, synovial proliferation forming pannus leading to cartilage and bone erosion.
2. Clinical Presentation: Morning stiffness lasting > 1 hour, symmetric involvement of MCP, PIP, wrists, MTPs (spares DIPs), deformities (swan-neck, boutonniere, ulnar drift), rheumatoid nodules.
3. Diagnostic Workup: RF (sensitive) and Anti-CCP (highly specific, prognostic for erosive disease), elevated ESR/CRP, joint aspiration (inflammatory synovial fluid), radiographs (juxta-articular osteopenia, marginal erosions, joint space narrowing). 2010 ACR/EULAR classification criteria.
4. Extra-Articular Manifestations: Interstitial lung disease, rheumatoid pleuritis, pericarditis, accelerated atherosclerosis, Felty syndrome (RA + splenomegaly + neutropenia), episcleritis/scleritis, rheumatoid vasculitis.
5. Management: Immediate initiation of conventional synthetic DMARDs (csDMARD: Methotrexate weekly with folic acid supplementation), Leflunomide, Sulfasalazine, Hydroxychloroquine. Biologic DMARDs (bDMARD: anti-TNF agents infliximab, adalimumab, etanercept; anti-IL-6 tocilizumab; anti-CD20 rituximab; CTLA-4 abatacept) and targeted synthetic DMARDs (JAK inhibitors tofacitinib, baricitinib). Pre-biologic screening (TB QuantiFERON/PPD, hepatitis B/C). Short-term glucocorticoid bridging.`;

    console.log(`Processing ${rheumLesson.title} with processLesson...`);
    await processLesson(rheumLesson.id, richContext);
    console.log(`Completed ${rheumLesson.title}!`);
  }

  // 3. Tropical (Sem 7 > 1.4r7 Videos)
  const tropLesson = await prisma.lesson.findUnique({
    where: { id: "cmv6r24th00cyjk06z6u7luq7" },
    include: { files: true },
  });
  if (tropLesson) {
    console.log(`\nPreparing content for ${tropLesson.title}...`);
    const sourceLesson = await prisma.lesson.findFirst({
      where: { subject: { title: "3.Med 4" }, title: "Tropical" },
      select: { title: true, summary: true },
    });
    const filesList = tropLesson.files.map((f) => `- ${f.title}`).join("\n");
    const richContext = `Tropical Medicine and Infectious Diseases Core Curriculum:
Lecture Topics & Modules:
${filesList}

Core Medical Knowledge:
${sourceLesson?.summary || ""}

High-Yield Topics:
1. Antimicrobial Agents: Penicillins, cephalosporins (generations 1-5), carbapenems, macrolides, fluoroquinolones, aminoglycosides, glycopeptides (vancomycin), oxazolidinones (linezolid). Mechanisms, spectra, side effects (nephrotoxicity, ototoxicity, QT prolongation, tendon rupture).
2. Brucellosis & Tuberculosis: Brucellosis (zoonosis via unpasteurized dairy, undulating fever, hepato-splenomegaly, sacroiliitis, agglutination test, treatment: Doxycycline + Rifampin or Streptomycin for 6 weeks). Tuberculosis (primary vs reactivation, apical cavitation, Ghon complex, Mantoux/IGRA, RIPE therapy: Rifampin, Isoniazid with pyridoxine, Pyrazinamide, Ethambutol).
3. Viral Hepatitis: HAV, HBV, HCV, HDV, HEV. Serological interpretation (HBsAg, anti-HBs, anti-HBc IgM vs IgG, HBeAg), management of chronic HBV (tenofovir, entecavir), direct-acting antivirals (DAAs) for HCV cure (sofosbuvir/velpatasvir).
4. Viral Pathogens: HIV/AIDS (CD4 counts, opportunists: PCP, Cryptococcus, Toxoplasmosis, CMV, MAC; antiretroviral therapy ART), Epstein-Barr Virus (mononucleosis, atypical lymphocytes, heterophile antibodies, splenic rupture risk), Influenza, Viral Hemorrhagic Fevers (Dengue, Yellow fever, Ebola).
5. Enteric Infections: Typhoid fever (Salmonella enterica serovar Typhi, rose spots, step-ladder fever, relative bradycardia Faget sign, ceftriaxone/azithromycin), Cholera (Vibrio cholerae, cholera toxin, rice-water stools, rapid rehydration with WHO-ORS and IV Ringer lactate, doxycycline), Clostridioides difficile (pseudomembranous colitis, oral fidaxomicin or vancomycin), Leptospirosis (Weil disease: jaundice, renal failure, hemorrhage).
6. Parasitology: Schistosomiasis (S. haematobium terminal spine hematuria/bladder cancer vs S. mansoni lateral spine pipestem cirrhosis/portal hypertension; Praziquantel), Amoebiasis (Entamoeba histolytica, flask-shaped ulcers, anchovy paste liver abscess; Metronidazole + luminal paromomycin), Malaria (P. falciparum ring forms, severe cerebral malaria, Artemisinin-based combination therapy ACT, chloroquine/primaquine for vivax/ovale hypnozoites), Leishmaniasis (cutaneous vs visceral Kala-azar, amphotericin B), Hydatid cyst (Echinococcus granulosus, anaphylaxis risk on aspiration, Albendazole + PAIR).`;

    console.log(`Processing ${tropLesson.title} with processLesson...`);
    await processLesson(tropLesson.id, richContext);
    console.log(`Completed ${tropLesson.title}!`);
  }

  // 4. CP & Congenital malformation (Hydrocephalus) (Sem 7 > 12.recorded)
  const cpLesson = await prisma.lesson.findUnique({
    where: { id: "cmv6r4pel020gjk06lp8rnjw3" },
    include: { files: true },
  });
  if (cpLesson) {
    console.log(`\nPreparing content for ${cpLesson.title}...`);
    const pedsSource = await prisma.lesson.findMany({
      where: { subject: { title: "4.Pediatrics" } },
      select: { title: true, summary: true },
    });
    const combinedPeds = pedsSource
      .map((l) => `\n\n=== PEDIATRIC MODULE: ${l.title} ===\n${l.summary}`)
      .join("\n");
    const richContext = `Pediatric Neurology: Cerebral Palsy & Congenital Malformations (Hydrocephalus):
${combinedPeds}

High-Yield Topics:
1. Cerebral Palsy (CP):
   - Definition: Non-progressive motor and postural disorder resulting from insult to developing fetal or infant brain.
   - Etiology: Prenatal (prematurity, intraventricular hemorrhage, periventricular leukomalacia, congenital infections TORCH), perinatal (hypoxic-ischemic encephalopathy, birth trauma), postnatal (meningitis, kernicterus, trauma).
   - Clinical Types:
     * Spastic CP (70-80%): Spastic diplegia (prematurity, PVL, legs > arms, scissor gait), spastic quadriplegia (severe brain damage, microcephaly, pseudobulbar palsy), spastic hemiplegia (asymmetric hand preference < 1 year).
     * Dyskinetic / Athetoid CP: Basal ganglia injury (often kernicterus or asphyxia), choreoathetoid movements, dysarthria, normal cognitive potential often preserved.
     * Ataxic CP: Cerebellar involvement, wide-based unsteady gait, intention tremor.
     * Hypotonic CP: Generalized flaccidity, persistent head lag.
   - Associated Problems: Epilepsy, intellectual disability, visual/hearing impairments, orthopedic contractures, feeding difficulties.
   - Management: Multidisciplinary (physiotherapy, occupational therapy), spasticity management (baclofen, botulinum toxin A injections, selective dorsal rhizotomy).
2. Congenital Malformations & Hydrocephalus:
   - Pathophysiology & Classification: Communicating (impaired CSF absorption by arachnoid villi e.g., post-meningitis, post-hemorrhagic) vs Non-communicating/Obstructive (obstruction within ventricular system: aqueductal stenosis, Dandy-Walker malformation, Chiari II malformation).
   - Clinical Signs in Infants: Rapidly enlarging head circumference crossing percentiles, bulging non-pulsatile anterior fontanelle, widely separated sutures, setting-sun eye phenomenon, prominent scalp veins, Macewen's sign (cracked pot sound on percussion), irritability, vomiting.
   - Diagnostic Modalities: Transfontanellar cranial ultrasonography (initial in neonates), brain MRI (gold standard for anatomical etiology and ventricular dimensions).
   - Treatment: Surgical diversion: Ventriculoperitoneal (VP) shunt, Endoscopic Third Ventriculostomy (ETV) with choroid plexus cauterization. Complications of shunts: mechanical malfunction/blockage, shunt infection (Staphylococcus epidermidis, S. aureus), over-drainage (subdural hematoma).
   - Neural Tube Defects: Spina bifida occulta, meningocele, myelomeningocele (strongly associated with Chiari II and hydrocephalus), elevated maternal serum alpha-fetoprotein (MSAFP), prevention with peri-conceptional folic acid (400 mcg standard, 4 mg for high-risk).`;

    console.log(`Processing ${cpLesson.title} with processLesson...`);
    await processLesson(cpLesson.id, richContext);
    console.log(`Completed ${cpLesson.title}!`);
  }

  // 5. Congenital heart ped (Sem 7 > 12.recorded)
  const chdLesson = await prisma.lesson.findUnique({
    where: { id: "cmv6r4p9p020ajk06aide6gi6" },
    include: { files: true },
  });
  if (chdLesson) {
    console.log(`\nPreparing content for ${chdLesson.title}...`);
    const richContext = `Pediatric Cardiology: Congenital Heart Diseases (Acyanotic and Cyanotic CHD):
1. Acyanotic CHD with Left-to-Right Shunts:
   - Ventricular Septal Defect (VSD): Most common congenital heart lesion (membranous > muscular). Harsh pansystolic/holosystolic murmur at left lower sternal border with thrill. Small defects (Maladie de Roger) are loud; large defects cause CHF, pulmonary hypertension, and softer murmurs. Spontaneous closure common in small muscular defects. Surgical patch closure if failure to thrive or pulmonary hypertension develops.
   - Atrial Septal Defect (ASD): Secundum (most common, fossa ovalis), Primum (associated with AVSD/Down syndrome). Wide, fixed splitting of S2 and ejection systolic murmur in pulmonary area (due to increased flow, not defect itself). Often asymptomatic in childhood; closure (percutaneous or surgical) indicated to prevent adult pulmonary hypertension and arrhythmias.
   - Patent Ductus Arteriosus (PDA): Connection between proximal descending aorta and pulmonary artery. Associated with prematurity, maternal rubella. Continuous rough "machinery" murmur heard best at left infraclavicular area, bounding peripheral pulses (water-hammer pulse, wide pulse pressure). Medical closure with IV indomethacin or ibuprofen in preterms; transcatheter coil/device closure in infants.
   - Atrioventricular Septal Defect (AVSD / Endocardial Cushion Defect): Highly associated with Down syndrome (Trisomy 21). Left-axis deviation on ECG, heart failure early in infancy.
2. Obstructive Acyanotic Lesions:
   - Coarctation of the Aorta: Constriction of aorta near ductus arteriosus. Femoral pulses delayed and diminished compared to radial pulses; upper extremity hypertension with lower extremity hypotension. Systolic murmur in interscapular region. Chest X-ray: "figure-of-3" sign and rib notching (inferior rib erosion by dilated collateral intercostal arteries in older children). Treatment: Balloon angioplasty or surgical resection.
   - Pulmonary Stenosis & Aortic Stenosis: Systolic ejection murmurs, click, ventricular hypertrophy.
3. Cyanotic CHD (Right-to-Left Shunt / The 5 Ts):
   - Tetralogy of Fallot (TOF): Most common cyanotic heart defect after infancy. 4 components: 1) Large VSD, 2) Pulmonary stenosis / RV outflow tract obstruction (determines degree of cyanosis), 3) Overriding aorta, 4) Right ventricular hypertrophy (RVH). Clinical: Cyanosis, clubbing, "hypercyanotic / Tet spells" (paroxysms of hyperpnea, restlessness, worsening cyanosis during crying or feeding relieved by knee-chest position). Chest X-ray: "boot-shaped heart" (coeur en sabot), oligemic lung fields. Murmur: Ejection systolic murmur of pulmonary stenosis (becomes quieter during tet spell). Definitive repair: Surgical patch of VSD and RVOT relief in early infancy.
   - Transposition of the Great Arteries (TGA): Most common cyanotic lesion in neonates. Aorta arises from RV, Pulmonary artery from LV (two parallel closed circuits). Incompatible with life unless mixing exists (PDA, VSD, PFO/ASD). Cyanosis unresponsive to 100% oxygen (hyperoxia test). Chest X-ray: "Egg-on-a-string" appearance. Management: Prostaglandin E1 (alprostadil) infusion to maintain PDA patency, Rashkind balloon atrial septostomy, definitive Arterial Switch Operation (Jatene) in first 2-3 weeks of life.
   - Tricuspid Atresia, Truncus Arteriosus, Total Anomalous Pulmonary Venous Return (TAPVR - "snowman" / figure-8 sign).
4. Heart Failure in Infants:
   - Manifestations: Tachypnea, diaphoresis especially during feeds, failure to thrive, hepatomegaly, gallop rhythm.
   - Medical Therapy: Loop diuretics (furosemide), ACE inhibitors (captopril to reduce afterload), cautiously digoxin for inotropy.
5. Eisenmenger Syndrome:
   - Irreversible pulmonary vascular obstructive disease with reversal of left-to-right shunt to right-to-left shunt, causing central cyanosis, clubbing, and polycythemia. Heart-lung transplantation is only definitive option.`;

    console.log(`Processing ${chdLesson.title} with processLesson...`);
    await processLesson(chdLesson.id, richContext);
    console.log(`Completed ${chdLesson.title}!`);
  }

  // 6. Record final ped (Sem 7 > 12.recorded)
  const recLesson = await prisma.lesson.findUnique({
    where: { id: "cmv6r4q250218jk06a0nqzxvx" },
    include: { files: true },
  });
  if (recLesson) {
    console.log(`\nPreparing content for ${recLesson.title}...`);
    const richContext = `Pediatrics Clinical Examination and Diagnostic Interpretation Core Curriculum:
Modules:
- Neuro Examination (Infant & Child Developmental and Neurological Assessment)
- X-ray and Lab Diagnostics (Pediatric Chest/Abdominal Radiography, CBC, and Urinalysis)
- Cardiovascular Examination (Pediatric Heart Assessment, Murmurs, and Heart Failure)

High-Yield Topics:
1. Pediatric Neurological & Developmental Examination:
   - Developmental Milestones: Gross motor (head holding 3-4 mo, sitting unsupported 6-8 mo, crawling 9-10 mo, walking independently 12-15 mo), Fine motor (pincer grasp 9-12 mo, building 3-cube tower 18 mo), Language (babbling 6 mo, first words 12 mo, 2-word phrases 2 yrs), Social (social smile 6-8 wks, stranger anxiety 6-9 mo).
   - Tone Assessment: Traction response (head lag), ventral suspension, vertical suspension, scarf sign (elbow should not cross midline in term infants). Hypotonia ("floppy infant" - central vs peripheral e.g. SMA) vs Hypertonia.
   - Primitive Reflexes: Moro reflex (appears at birth, disappears by 4-6 months; persistent beyond 6 mo suggests cerebral pathology), Palmar and Plantar grasp, Rooting, Asymmetric Tonic Neck Reflex (ATNR / fencing posture), Babinski sign (normal/extensor up to 12-18 months).
   - Cranial nerves and meningeal signs in infants (irritability, high-pitched cry, bulging fontanelle; Kernig and Brudzinski often absent under 1-2 years).
2. Pediatric Radiology & Laboratory Interpretation:
   - Chest Radiography (CXR): Normal thymus ("sail sign"), Respiratory Distress Syndrome RDS / Hyaline Membrane Disease in preterms (diffuse reticulogranular ground-glass pattern with air bronchograms, low lung volume), Transient Tachypnea of the Newborn TTN (fluid in interlobar fissures, hyperaeration), Meconium Aspiration Syndrome MAS (patchy asymmetrical infiltrates, hyperinflation), Foreign body aspiration (hyperlucency/air trapping on expiratory view), Cardiomegaly (cardiothoracic ratio > 0.6 in infants, > 0.5 in older children).
   - Abdominal Radiography (AXR): Necrotizing Enterocolitis NEC (pneumatosis intestinalis - air in bowel wall, portal venous gas, pneumoperitoneum / football sign), Intussusception (target sign, meniscus sign, crescent sign; ultrasound gold standard with "doughnut" / target sign), Congenital duodenal atresia ("double-bubble" sign).
   - Complete Blood Count (CBC): Age-specific norms (physiologic anemia of infancy at 2-3 months nadir Hb 9-11 g/dL), Iron deficiency anemia (microcytic hypochromic, low ferritin, high RDW, Mentzer index > 13) vs Thalassemia trait (low MCV, normal/high RBC count, Mentzer index < 13), Neonatal sepsis screen (leukopenia < 5,000, immature to total neutrophil I:T ratio > 0.2, elevated CRP).
   - Urinalysis: Pediatric UTI (pyuria > 5-10 WBC/hpf, positive leukocyte esterase and nitrites; gold standard: urine culture > 10^5 CFU/mL from clean catch, > 10^4 from catheter, any growth from suprapubic aspiration), Nephrotic syndrome (heavy proteinuria > 40 mg/m^2/hr, 3+ to 4+, hypoalbuminemia < 2.5 g/dL, hyperlipidemia, generalized edema) vs Glomerulonephritis (dysmorphic RBCs, RBC casts, cola-colored urine, hypertension, periorbital edema).
3. Pediatric Cardiovascular Examination:
   - Inspection & Palpation: Precordial bulge, apical impulse location (4th intercostal space lateral to midclavicular line in infants), thrills, parasternal heave, capillary refill time (< 2 seconds), peripheral pulses (brachial vs femoral - always palpate femoral pulses to exclude coarctation of aorta).
   - Auscultation: Heart rate variation with respiration (sinus arrhythmia), S1 and S2 physiological splitting.
   - Murmurs: Innocent vs Pathological:
     * Innocent murmurs: Still murmur (vibratory/musical, low-pitched, LLSB, louder when supine, disappears on standing/Valsalva), Venous hum (continuous infraclavicular, disappears on compression of internal jugular or supine position), Pulmonary flow murmur. Never diastolic, grade <= 2/6, asymptomatic child.
     * Pathological murmurs: Any diastolic murmur, pansystolic murmur, continuous machinery murmur, grade >= 3/6, associated with thrill, abnormal S2, or symptoms (sweating during feeds, poor weight gain, cyanosis).`;

    console.log(`Processing ${recLesson.title} with processLesson...`);
    await processLesson(recLesson.id, richContext);
    console.log(`Completed ${recLesson.title}!`);
  }

  console.log("\n=== MULTIMEDIA LESSONS PROCESSING FINISHED ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

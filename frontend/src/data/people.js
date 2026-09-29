/**
 * Synthetic organisation: Vidyut Systems, Pune. 24 fictional employees.
 *
 * `patterns` is an INPUT to the evidence generator only (the engine never reads
 * it). The test suite checks that the engine recovers every pattern from the
 * evidence alone.
 *   I improving · S stagnating · D declining · N insufficient · X conflicting
 *   M improving, but a required source is missing in the last 90 days
 */
export const HR_USERS = [
  { id: 'hr-neha', name: 'Neha Menon', title: 'HR Admin · Pune', email: 'neha.menon@vidyut.in', password: 'demo', role: 'hr' },
]

const E = (id, name, role, team, location, experience, manager, competencies, patterns, extra = {}) => ({
  id, name, role, team, location, experience, manager, competencies, patterns, email: `${id.split('-')[0]}.${id.split('-')[1]}@vidyut.in`, ...extra,
})

export const EMPLOYEES = [
  E('aarav-sharma', 'Aarav Sharma', 'Senior Backend Engineer', 'Platform', 'Bengaluru', '6 yrs', 'Vikram Deshpande',
    ['api_design', 'system_design', 'cloud_security', 'mentoring', 'python', 'technical', 'communication', 'teamwork'], 'IINSIIII'),
  E('riya-patil', 'Riya Patil', 'Product Manager', 'Growth', 'Pune', '7 yrs', 'Sunita Rao',
    ['leadership', 'python', 'stakeholder', 'communication', 'data_storytelling', 'teamwork', 'problem_solving'], 'ISIIIII'),
  E('aditya-kulkarni', 'Aditya Kulkarni', 'Backend Engineer', 'Platform', 'Bengaluru', '3 yrs', 'Vikram Deshpande',
    ['system_design', 'api_design', 'technical', 'python', 'problem_solving', 'teamwork'], 'DIIIIS'),
  E('sneha-deshmukh', 'Sneha Deshmukh', 'Product Analyst', 'Insights', 'Pune', '4 yrs', 'Sunita Rao',
    ['technical', 'communication', 'leadership', 'problem_solving', 'teamwork', 'data_storytelling', 'stakeholder'], 'ISXNIIS', { hero: true }),
  E('rahul-jadhav', 'Rahul Jadhav', 'QA Engineer', 'Quality', 'Pune', '5 yrs', 'Anjali Gokhale',
    ['test_automation', 'technical', 'communication', 'teamwork', 'problem_solving', 'accessibility'], 'SIIIDI'),
  E('priya-mehta', 'Priya Mehta', 'UI Engineer', 'Experience', 'Hyderabad', '4 yrs', 'Farah Qureshi',
    ['accessibility', 'technical', 'communication', 'teamwork', 'api_design', 'problem_solving', 'data_storytelling', 'mentoring'], 'NIIIIISI'),
  E('yash-verma', 'Yash Verma', 'Data Engineer', 'Insights', 'Pune', '3 yrs', 'Sunita Rao',
    ['python', 'leadership', 'technical', 'system_design', 'teamwork', 'communication'], 'ISIIIS'),
  E('ananya-joshi', 'Ananya Joshi', 'UX Designer', 'Experience', 'Pune', '5 yrs', 'Farah Qureshi',
    ['accessibility', 'communication', 'data_storytelling', 'teamwork', 'stakeholder', 'problem_solving', 'leadership'], 'IIIIISS'),
  E('kunal-shah', 'Kunal Shah', 'DevOps Engineer', 'Platform', 'Hyderabad', '6 yrs', 'Vikram Deshpande',
    ['cloud_security', 'technical', 'system_design', 'python', 'teamwork', 'mentoring', 'problem_solving'], 'IIIISSI'),
  E('neha-joshi', 'Neha Joshi', 'Business Analyst', 'Growth', 'Pune', '4 yrs', 'Sunita Rao',
    ['stakeholder', 'communication', 'data_storytelling', 'problem_solving', 'teamwork', 'leadership'], 'IIMIIS'),
  E('ishaan-iyer', 'Ishaan Iyer', 'Software Engineer I', 'Platform', 'Bengaluru', '1 yr', 'Vikram Deshpande',
    ['technical', 'python', 'api_design', 'teamwork', 'communication', 'problem_solving'], 'INIISI'),
  E('meera-nair', 'Meera Nair', 'Data Scientist', 'Insights', 'Bengaluru', '5 yrs', 'Sunita Rao',
    ['python', 'data_storytelling', 'problem_solving', 'communication', 'technical', 'stakeholder', 'teamwork'], 'IIIDDIX'),
  E('rohan-gupta', 'Rohan Gupta', 'Senior Software Engineer', 'Platform', 'Pune', '8 yrs', 'Vikram Deshpande',
    ['technical', 'leadership', 'system_design', 'api_design', 'mentoring', 'communication', 'teamwork'], 'IDIIISI'),
  E('tanvi-rao', 'Tanvi Rao', 'QA Engineer', 'Quality', 'Hyderabad', '3 yrs', 'Anjali Gokhale',
    ['test_automation', 'technical', 'accessibility', 'teamwork', 'communication', 'problem_solving'], 'IINIIS'),
  E('siddharth-menon', 'Siddharth Menon', 'Solutions Architect', 'Platform', 'Bengaluru', '12 yrs', 'Vikram Deshpande',
    ['system_design', 'cloud_security', 'stakeholder', 'leadership', 'mentoring', 'communication'], 'IIDIDI'),
  E('pooja-chavan', 'Pooja Chavan', 'Customer Success Manager', 'Growth', 'Pune', '6 yrs', 'Sunita Rao',
    ['stakeholder', 'communication', 'problem_solving', 'teamwork', 'leadership', 'data_storytelling'], 'ISISXI'),
  E('harsh-agarwal', 'Harsh Agarwal', 'Backend Engineer', 'Platform', 'Hyderabad', '3 yrs', 'Vikram Deshpande',
    ['technical', 'api_design', 'python', 'system_design', 'teamwork', 'problem_solving'], 'IIDMII'),
  E('kavya-reddy', 'Kavya Reddy', 'Product Designer', 'Experience', 'Hyderabad', '4 yrs', 'Farah Qureshi',
    ['accessibility', 'communication', 'data_storytelling', 'teamwork', 'stakeholder', 'leadership'], 'ISIIIN'),
  E('omkar-pawar', 'Omkar Pawar', 'IT Support Engineer', 'Quality', 'Pune', '5 yrs', 'Anjali Gokhale',
    ['technical', 'cloud_security', 'communication', 'teamwork', 'problem_solving', 'test_automation'], 'SDIIIS'),
  E('nikita-bhosale', 'Nikita Bhosale', 'Associate Product Manager', 'Growth', 'Pune', '2 yrs', 'Sunita Rao',
    ['stakeholder', 'communication', 'data_storytelling', 'leadership', 'problem_solving', 'teamwork'], 'IIXIID'),
  E('farhan-shaikh', 'Farhan Shaikh', 'Mobile Engineer', 'Experience', 'Mumbai', '4 yrs', 'Farah Qureshi',
    ['technical', 'api_design', 'teamwork', 'communication', 'python', 'accessibility'], 'IDIINI'),
  E('shreya-banerjee', 'Shreya Banerjee', 'Data Analyst', 'Insights', 'Bengaluru', '2 yrs', 'Sunita Rao',
    ['python', 'data_storytelling', 'communication', 'problem_solving', 'teamwork', 'stakeholder'], 'IIIMIS'),
  E('arjun-pillai', 'Arjun Pillai', 'Staff Engineer', 'Platform', 'Bengaluru', '13 yrs', 'Vikram Deshpande',
    ['system_design', 'leadership', 'mentoring', 'technical', 'api_design', 'communication', 'cloud_security'], 'IIDIIIN'),
  E('divya-kapoor', 'Divya Kapoor', 'Scrum Master', 'Growth', 'Mumbai', '7 yrs', 'Sunita Rao',
    ['leadership', 'communication', 'stakeholder', 'teamwork', 'problem_solving', 'mentoring', 'data_storytelling'], 'IIXISMD'),
]

export const initials = (name) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
export const firstName = (name) => name.split(' ')[0]

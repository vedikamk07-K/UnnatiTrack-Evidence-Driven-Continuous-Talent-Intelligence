import { useParams } from 'react-router-dom'
import CompetencyView from '../../components/CompetencyView.jsx'
import { Empty } from '../../components/ui.jsx'
import { useData } from '../../state/DataContext.jsx'

export default function CompetencyPage() {
  const { id, cid } = useParams()
  const { org, evidence, asOf } = useData()
  const a = org.byEmployee[id]
  if (!a) return <Empty title="Employee not found" />
  const c = a.competencies.find((x) => x.competencyId === cid)
  return (
    <CompetencyView hr person={a.employee} a={c}
      evidence={evidence.filter((e) => e.employeeId === id && e.date <= asOf)} back={[{ to: '/hr/employees', label: 'Employees' }, { to: `/hr/employees/${id}`, label: a.employee.name }]} />
  )
}

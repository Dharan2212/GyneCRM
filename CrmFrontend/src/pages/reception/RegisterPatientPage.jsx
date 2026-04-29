import RxRegister from '../../crm/pages/RxRegister.jsx'
import { useCrmPageNavigation } from '../../modules/shared/useCrmPageNavigation.js'
import { useRegisterPatientMutation } from '../../modules/patients/patients.hooks.js'

export default function RegisterPatientPage() {
  const goTo = useCrmPageNavigation('receptionist')
  const mutation = useRegisterPatientMutation()

  return (
    <RxRegister
      onSubmit={mutation.register}
      isSubmitting={mutation.isLoading}
      submitError={mutation.error}
      onResetError={mutation.reset}
      goTo={goTo}
    />
  )
}

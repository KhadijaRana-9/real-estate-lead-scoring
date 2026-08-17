import AgencyRegistrationWizard from '../components/agencyRegistration/AgencyRegistrationWizard'
import CityGridBackground from '../components/CityGridBackground'

export default function AgencyRegister() {
  return (
    <div className="relative w-full">
      {/* Fixed-height decorative band pinned to the top of the page,
          same visual language as Login/Signup. CityGridBackground is
          `absolute inset-0` internally, so it sizes to THIS band's
          height (not the registration form's, which can run much
          taller across 4 steps) - the wizard below is a normal-flow
          sibling, never stretched or clipped by it. Once the page
          scrolls past this band, the form continues over the page's
          own flat background, which is expected on a long multi-step
          form rather than trying to stretch the skyline to match it. */}
      <div className="absolute inset-x-0 top-0 h-[70vh] overflow-hidden">
        <CityGridBackground />
      </div>
      <AgencyRegistrationWizard />
    </div>
  )
}

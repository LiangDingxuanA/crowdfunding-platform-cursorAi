export default function OnboardingProgress({ currentStep }: { currentStep: number }) {
  const steps = [
    { name: 'Personal Information', step: 1 },
    { name: 'Identity Verification', step: 2 },
    { name: 'Address Verification', step: 3 },
  ]

  return (
    <div className="py-4">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Progress">
          <ol role="list" className="flex items-center">
            {steps.map((step, stepIdx) => (
              <li
                key={step.name}
                className={`${
                  stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''
                } relative`}
              >
                <div className="flex items-center">
                  <div
                    className={`${
                      step.step <= currentStep
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    } h-8 w-8 rounded-full flex items-center justify-center`}
                  >
                    <span
                      className={`${
                        step.step <= currentStep
                          ? 'text-white'
                          : 'text-gray-500'
                      } text-sm font-medium`}
                    >
                      {step.step}
                    </span>
                  </div>
                  {stepIdx !== steps.length - 1 && (
                    <div
                      className={`${
                        step.step < currentStep
                          ? 'bg-blue-600'
                          : 'bg-gray-200'
                      } hidden sm:block w-full h-0.5 ml-4`}
                    />
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-xs font-medium text-gray-900">
                    {step.name}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  )
} 
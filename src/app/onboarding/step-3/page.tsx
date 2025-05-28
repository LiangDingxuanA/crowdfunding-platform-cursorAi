'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import OnboardingProgress from '@/components/OnboardingProgress'

const residentialOptions = [
  {
    id: 'own',
    title: 'I own my own home',
    description: 'You are the owner of the property you live in',
  },
  {
    id: 'tenant',
    title: 'I am the registered tenant of a rental property',
    description: 'You have a formal rental agreement',
  },
  {
    id: 'share',
    title: 'I share my accommodation and I am not the registered tenant',
    description: 'You share accommodation with others',
  },
  {
    id: 'hotel',
    title: 'I am staying in a hotel apartment for at least 3 months',
    description: 'Long-term hotel accommodation',
  },
  {
    id: 'company',
    title: 'I live in a company sponsored residence',
    description: 'Your accommodation is provided by your employer',
  },
  {
    id: 'other',
    title: 'My residential situation is not listed here',
    description: 'Other living arrangements',
  },
]

export default function OnboardingStep3() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProofFile(file)
        setProofPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate loading
    setTimeout(() => {
      router.push('/dashboard')
    }, 1000)
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <OnboardingProgress currentStep={3} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Verify Your Address
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              This information is required by financial regulations. Please select
              your current residential status and provide proof of address.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div>
                <label className="text-base font-medium text-gray-900">
                  What is your current residential status?
                </label>
                <p className="text-sm text-gray-500">
                  Select the option that best describes your living situation
                </p>

                <div className="mt-4 space-y-4">
                  {residentialOptions.map((option) => (
                    <div
                      key={option.id}
                      className="relative flex items-start"
                    >
                      <div className="flex items-center h-5">
                        <input
                          id={option.id}
                          name="residential-status"
                          type="radio"
                          checked={selectedOption === option.id}
                          onChange={() => setSelectedOption(option.id)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label
                          htmlFor={option.id}
                          className="font-medium text-gray-700"
                        >
                          {option.title}
                        </label>
                        <p className="text-gray-500">{option.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOption && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Upload Proof of Address
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    Please upload either a bank statement, credit card statement,
                    title deed, utilities bill, or telecom bill
                  </p>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      {proofPreview ? (
                        <div className="relative h-40 w-full">
                          <Image
                            src={proofPreview}
                            alt="Document preview"
                            fill
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="proof-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 text-black"
                        >
                          <span>Upload a file</span>
                          <input
                            id="proof-upload"
                            name="proof-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, PDF up to 10MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Skip for now
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {loading ? 'Verifying...' : 'Complete Setup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 
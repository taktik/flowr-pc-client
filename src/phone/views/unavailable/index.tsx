import * as React from 'react'

interface Props {
  className?: string
}
export const Unavailable = (props: Props) => <div className={props.className}>Sorry, this functionality is not available at the moment.</div>

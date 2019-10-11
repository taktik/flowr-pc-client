import * as moment from 'moment'

export function formatElapsedTime(elapsedTime: number = 0) {
  const elapsedTimeInSeconds = elapsedTime / 1000
  const seconds = Math.floor(elapsedTimeInSeconds % 60)
  const elapsedTimeInMinutes = (elapsedTimeInSeconds - seconds) / 60
  const minutes = Math.floor(elapsedTimeInMinutes % 60)
  const hours = Math.floor(elapsedTimeInSeconds / 3600)

  function pad(num: number) {
    let padded = `${num}`

    while (padded.length < 2) {
      padded = `0${padded}`
    }

    return padded
  }

  let formatted = `${pad(minutes)}:${pad(seconds)}`

  if (hours > 0) {
    formatted = `${pad(hours)}:${formatted}`
  }

  return formatted
}

export function formatDate(timestamp: number, format: string = 'DD MM YYYY'): string {
  return moment(timestamp).format(format)
}

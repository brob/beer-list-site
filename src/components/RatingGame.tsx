import { useState, useEffect } from "react"



function BeerCard({beer, isCorrect, hasAnswered, setHasAnswered, setWinner}) {
    const {name, description, brewery, abv, ibu, myScore, style} = beer.data
    
    const handleClick = () => {
        if (!hasAnswered) {
            setHasAnswered(true)
            setWinner(isCorrect)
        }
    }
    let backgroundColor = 'bg-white'
    
    if (hasAnswered) {
        backgroundColor = isCorrect ? 'bg-green-200' : 'bg-red-200'
    }

    return (
        <div onClick={handleClick} className={`${backgroundColor} ${hasAnswered ? '' : 'cursor-pointer'} shadow-md rounded-lg p-4 mb-4`}>
            <h2 className="text-xl font-bold mb-2">{name}</h2>
            {hasAnswered && <h3 className="text-xl font-bold mb-2">{myScore}</h3>}
            <p className="text-gray-700 mb-2">{description}</p>
            <p className="text-gray-500 mb-2">{brewery.name}</p>
            <p className="text-gray-500 mb-2">ABV: {abv}%</p>
            <p className="text-gray-500">IBU: {ibu}</p>
            <p className="text-gray-500">Style: {style}</p>
        </div>
    )
}



function ScoreBoard({score, setScore, winner}) {

    useEffect(() => {
        if (winner) {
            setScore(score + 1)
        }
    }, [winner])
    return (
        <div className="text-center my-4">
            <h2 className="text-3xl font-bold text-blue-600">My Score: {score}</h2>
        </div>
    )
}




export function RatingGame({beers, beerCount}) {
    const [boardBeers, setBoardBeers] = useState([])
    const [correctAnswer, setCorrectAnswer] = useState(null)
    const [highValue, setHighValue] = useState(null)
    const [hasAnswered, setHasAnswered] = useState(false)
    const [winner, setWinner] = useState(null)
    const [reset, setReset] = useState(false)
    const [score, setScore] = useState(0)
    function getRandomBeer() {
        return beers[Math.floor(Math.random() * beerCount)]
    }

    useEffect(() => {
        setWinner(null)
        setHasAnswered(false)
        const initialBeers = [getRandomBeer(), getRandomBeer()]
        const higherRatedBeerId = initialBeers[0].myScore > initialBeers[1].myScore ? initialBeers[0].id : initialBeers[1].id;
        const higherValue = Math.max(initialBeers[0].data.myScore , initialBeers[1].data.myScore)
        setHighValue(higherValue)

        setBoardBeers(initialBeers)
        setCorrectAnswer(higherRatedBeerId)
        setReset(false)
        setWinner(null)
    }, [reset])
    const handleClick = () => {
        setReset(true)
    }

    return (<div>
        <ScoreBoard score={score} setScore={setScore} winner={winner} />
        <h2 className="text-xl">Which beer has a higher rating?</h2>
        <div className="grid grid-cols-2 gap-4">
        {boardBeers.map(beer => <BeerCard key={beer.id} beer={beer} hasAnswered={hasAnswered} setHasAnswered={setHasAnswered} setWinner={setWinner} isCorrect={beer.data.myScore === highValue} />)}
        {hasAnswered && <h2 className={`text-2xl mb-10 ${winner ? 'color-green': 'color-red'}`}>{winner ? 'Correct!' : 'Wrong!'} <br /> <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={handleClick}>Try again</button></h2>}

        </div>
        </div>)
}
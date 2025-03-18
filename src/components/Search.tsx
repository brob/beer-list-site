import { useState } from 'react';
import { actions } from 'astro:actions'
import useDebounce from '../utils/useDebounce';
const Search = () => {
    const [inputValue, setInputValue] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isFocused, setIsFocused] = useState(false);

    const debouncedRequest = useDebounce(async () => {
        const { data, error } = await actions.search({ q: inputValue || '' });

        if (error) {
            console.error(error);
            return;
        }
        setSearchResults(data || []);

    })

    const handleFocus = () => setIsFocused(true);
    const handleSearch = async (event) => {
        const query = event.target.value;
        setInputValue(query)
        debouncedRequest();
    };
    return (
        <div className="relative md:m-0 mb-2">
            <input
            id="SearchField"
            name="Search"
            className="border border-gray-300 rounded-lg w-full p-2"
            type="text"
            value={inputValue}
            placeholder="Search beers..."
            onInput={handleSearch}
            onFocus={handleFocus}
            />
            {isFocused && searchResults.length > 0 && <div id="SearchResults" className="bg-white shadow-md rounded-lg p-4 max-h-60 max-w-xl absolute z-10 left-0 top-[2rem] overflow-y-scroll">
                <p className="text-xl font-bold">Search Results</p>
                <table id="SearchResultsTable" className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 max-w-[25%] text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rating
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Brewery
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {searchResults.length > 0 ? (
                            searchResults.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {item?.name || 'no name'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item?.myScore || 'no rating'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item?.brewery?.name && <a href={`/breweries/${item?.brewery?._id}`}>{item?.brewery?.name}</a>}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    No results found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>}
        </div>
    );
};

export default Search;
